import './App.css';
import { useState } from 'react';
import { saveAs } from 'file-saver';

function App() {
  const [discog, setDicogData] = useState([]);
  const [ppl, setPPLData] = useState([]);
  const [discogBtnTxt, setDiscogBtnTxt] = useState('Discog File');
  const [pplBtnTxt, setPPLBtnTxt] = useState('PPL File');
  const [mapBtnTxt, setMapBtnTxt] = useState('Map');
  let [progressCount, setProgressCount] = useState(0);
  let [progressTotal, setProgressTotal] = useState(0);

  const csvToJSON = (csv, delimator) => {
    const keys = csv.split('\n')[0].split(delimator);
    const json = csv.split('\n').slice(1).map((row) => {
      const values = row.split(delimator);
      const obj = {};
      keys.forEach((key, i) => {
        obj[key] = values[i];
      });
      return obj;
    });
    return json;
  }

  function readDiscogFile(e) {
    var file = e.target.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      var contents = e.target.result;
      setDicogData(csvToJSON(contents, '\t'));
      setDiscogBtnTxt('Discog Loaded');
    };
    reader.readAsText(file);
  }

  function readPPLFile(e) {
    var file = e.target.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    reader.onload = function (e) {
      var contents = e.target.result;
      setPPLData(csvToJSON(contents, ','));
      setPPLBtnTxt('PPL Loaded');
    };
    reader.readAsText(file);
  }

  function compareMap() {
    setMapBtnTxt('Mapping...');
    setTimeout(_compareMap, 100);
  }

  async function _compareMap() {

    const calculateScore = (pplRecord) => {
      const pplTitle = pplRecord.recordingTitle.toLowerCase();
      const pplTitleWords = pplTitle.split(' ');
      const pplTitlePartialWords = pplTitleWords.map((word) => {
        return word.slice(0, 3);
      });
      const pplTitlePartialWordsSet = new Set(pplTitlePartialWords);
      const pplTitleWordsSet = new Set(pplTitleWords);
      const pplTitleWordsLength = pplTitleWords.length;
      const pplTitlePartialWordsLength = pplTitlePartialWords.length;

      let maxScore = 0;
      let maxScoreIndex = 0;

      discog.forEach((discogRecord, i) => {
        const discogTitle = discogRecord.track_title.toLowerCase();
        const discogTitleWords = discogTitle.split(' ');
        const discogTitlePartialWords = discogTitleWords.map((word) => {
          return word.slice(0, 3);
        });
        const discogTitlePartialWordsSet = new Set(discogTitlePartialWords);
        const discogTitleWordsSet = new Set(discogTitleWords);
        const discogTitleWordsLength = discogTitleWords.length;
        const discogTitlePartialWordsLength = discogTitlePartialWords.length;

        const titleWordsMatch = pplTitleWordsSet.size + discogTitleWordsSet.size - new Set([...pplTitleWordsSet, ...discogTitleWordsSet]).size;
        const titlePartialWordsMatch = pplTitlePartialWordsSet.size + discogTitlePartialWordsSet.size - new Set([...pplTitlePartialWordsSet, ...discogTitlePartialWordsSet]).size;
        const score = (titleWordsMatch / (pplTitleWordsLength + discogTitleWordsLength)) + (titlePartialWordsMatch / (pplTitlePartialWordsLength + discogTitlePartialWordsLength));

        if (score > maxScore) {
          maxScore = score;
          maxScoreIndex = i;
        }
      });
      setProgressCount(++progressCount);
      pplRecord.similarity = { score: maxScore, discogIndex: maxScoreIndex };
      return pplRecord;
    }

    setProgressCount(0);
    setProgressTotal(ppl.length);

    const pplWithSimilarityPromises = ppl.map((record) => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(calculateScore(record));

        }, 2);
      });
    });

    Promise.all(pplWithSimilarityPromises).then((pplWithSimilarity) => {

      const filterScore = 1;
      const pplWithSimilarityFiltered = pplWithSimilarity.filter((pplRecord) => {
        return pplRecord.similarity.score >= filterScore;
      });

      // map similarity discogIndex to discog record
      const pplWithSimilarityDiscog = pplWithSimilarityFiltered.map((pplRecord) => {
        pplRecord.discog = discog[pplRecord.similarity.discogIndex];
        return pplRecord;
      });

      // flat discog record keys to ppl record keys and write to csv while keeping similaity score
      const _pplWithSimilarityDiscogFlat = pplWithSimilarityDiscog.map((pplRecord) => {
        const pplRecordFlat = { ...pplRecord };
        delete pplRecordFlat.discog;
        delete pplRecordFlat.similarity;
        const discogRecordFlat = { ...pplRecord.discog };
        return { ...pplRecordFlat, similarityScore: pplRecord.similarity.score, ...discogRecordFlat };
      });

      const pplWithSimilarityDiscogFlat = Array.from(new Set(_pplWithSimilarityDiscogFlat.map(t => t.recordingId))).map(recordId => _pplWithSimilarityDiscogFlat.find(t => t.recordingId === recordId))
      if (pplWithSimilarityDiscogFlat.length > 0) {
        const pplWithSimilarityDiscogFlatCSV = Object.keys(pplWithSimilarityDiscogFlat[0]).join(',') + '\n' + pplWithSimilarityDiscogFlat.map((pplRecord) => {
          return Object.values(pplRecord).join(',');
        }).join('\n');

        // Create a blob of the data
        var fileToSave = new Blob([pplWithSimilarityDiscogFlatCSV], {
          type: 'application/csv'
        });
        setMapBtnTxt('Map');
        saveAs(fileToSave, 'pplWithSimilarityDiscog.csv');
      } else {
        setMapBtnTxt('No Match Found');
        setTimeout(() => {
          setMapBtnTxt('Map');
          setProgressTotal(0);
        }, 2000);
      }
    })
  }

  return (
    <div className="App">
      <header className="App-header">
        {/* <input type="file" id="file1" accept=".csv" onChange={readDiscogFile} /> */}
        {/* <input type="file" id="file2" accept=".csv" onChange={readPPLFile} /> */}


        <div class="content">

          <div class="box">
            <input type="file" name="file-1[]" id="file-1" class="inputfile inputfile-1" onChange={readDiscogFile} />
            <label for="file-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="17" viewBox="0 0 20 17"><path d="M10 0l-5.2 4.9h3.3v5.1h3.8v-5.1h3.3l-5.2-4.9zm9.3 11.5l-3.2-2.1h-2l3.4 2.6h-3.5c-.1 0-.2.1-.2.1l-.8 2.3h-6l-.8-2.2c-.1-.1-.1-.2-.2-.2h-3.6l3.4-2.6h-2l-3.2 2.1c-.4.3-.7 1-.6 1.5l.6 3.1c.1.5.7.9 1.2.9h16.3c.6 0 1.1-.4 1.3-.9l.6-3.1c.1-.5-.2-1.2-.7-1.5z"></path></svg> <span>{discogBtnTxt}</span></label>
          </div>
          <div class="box">
            <input type="file" name="file-1[]" id="file-2" class="inputfile inputfile-1" onChange={readPPLFile} />
            <label for="file-2"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="17" viewBox="0 0 20 17"><path d="M10 0l-5.2 4.9h3.3v5.1h3.8v-5.1h3.3l-5.2-4.9zm9.3 11.5l-3.2-2.1h-2l3.4 2.6h-3.5c-.1 0-.2.1-.2.1l-.8 2.3h-6l-.8-2.2c-.1-.1-.1-.2-.2-.2h-3.6l3.4-2.6h-2l-3.2 2.1c-.4.3-.7 1-.6 1.5l.6 3.1c.1.5.7.9 1.2.9h16.3c.6 0 1.1-.4 1.3-.9l.6-3.1c.1-.5-.2-1.2-.7-1.5z"></path></svg> <span>{pplBtnTxt}</span></label>
          </div>
          <div class="box">
            {/* <input type="file" name="file-1[]" id="file-2" class="inputfile inputfile-1" onChange={readPPLFile}/> */}
            <button class="inputfile inputfile-1" onClick={compareMap}>{mapBtnTxt}</button>
            <label for="map" onClick={compareMap}> <span>{mapBtnTxt}</span></label>
          </div>
          <div>
            <label for="map"> <span>{`${progressTotal > 0 ? `Processing ${progressCount} / ${progressTotal}` : "State: Idle"}`}</span></label>
          </div>
          <div>
            <label for="map"> <span>{`${progressTotal > 0 ? `Progress ${((progressCount / progressTotal) * 100).toFixed(2)}%` : ""}`}</span></label>
          </div>
        </div>

        {/* <button onClick={compareMap}>{mapBtnTxt}</button> */}
      </header>


    </div>
  );
}

export default App;
