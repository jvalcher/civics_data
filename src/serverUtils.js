const fs = require('fs');
require('dotenv').config();


// get representative data from Google Civic API
const getRepsData = async (address, city, state, zip) => {
    const url = `https://www.googleapis.com/civicinfo/v2/representatives?key=${process.env.API_KEY}&address=${address}%20${city}%20${state}%20${zip}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}


// filter Google representative data
const filterReps = async (civicData) => {

    let data = {
        'address': undefined,
        'state': undefined,
        'city': undefined,
        'county': undefined,
        'district': undefined, 
        'reps': {
            'federal': [],
            'state': [],
            'city': [],
            'county': []
        }
    };

    // add address, city
    const a = civicData.normalizedInput;
    data.address = `${a.line1}, ${a.city}, ${a.state} ${a.zip}`;
    data.city = a.city;

    // add state, county, district
    let state;
    for (let key in civicData.divisions) {

        const regexState = new RegExp('state:..$');
        const regexCounty = new RegExp('county:[a-z]+$');
        const regexDistrict = new RegExp('cd:.{1,2}$');

        if (regexCounty.test(key)) {
            data.county = civicData.divisions[key].name;
        }
        
        else if (regexDistrict.test(key)) {
            data.district = civicData.divisions[key].name;
        }

        else if (regexState.test(key)) {
            state = civicData.divisions[key].name;
            data.state = civicData.divisions[key].name;
        }

    }
    
    // add representatives
    repLoop:
    for (let key in civicData.offices) {

        const title = civicData.offices[key].name
        const divId = civicData.offices[key].divisionId;
        const stateAbbrev = civicData.normalizedInput.state;
        const divState = stateAbbrev.toLowerCase();

        const regexFedExecReps = new RegExp('country:us$');         // divId
        const regexFedSenReps = new RegExp('U.S. Senator');         // title
        const regexFedReprReps = new RegExp('U.S. Representative'); // title
        const regexCountyReps = new RegExp('county');               // divId
        const regexCityReps = new RegExp('place:');                 // divId
        const regexStateReps = new RegExp(`state:${divState}`);;    // divId

        for (let i in civicData.offices[key].officialIndices) {

            const repIndex = civicData.offices[key].officialIndices[i];
            const repName = civicData.officials[repIndex].name;

            // federal
            if ( regexFedExecReps.test(divId) || 
                 regexFedSenReps.test(title)  ||
                 regexFedReprReps.test(title) ){
                
                const rep = {};
                rep[title] = repName;
                data.reps.federal.push(rep);
            }

            // county
            else if (regexCountyReps.test(divId)) {

                const repIgnoreFilters = [
                    'Clerk',
                    'Tax',
                    'Treasurer',
                    'District Clerk',
                    'Highway',
                    'Town'
                ]
                for (let filter of repIgnoreFilters) {
                    if (title.includes(filter)) {
                        continue repLoop
                    }
                }

                const rep = {};
                rep[title] = repName;
                data.reps.county.push(rep);
            }
            
            // city
            else if (regexCityReps.test(divId)) {

                const repIgnoreFilters = [
                    'Advocate',
                ]
                for (let filter of repIgnoreFilters) {
                    if (title.includes(filter)) {
                        continue repLoop
                    }
                }

                const rep = {};
                rep[title] = repName;
                data.reps.city.push(rep);
            }

            // state
            else if (regexStateReps.test(divId)) {

                const repIgnoreFilters = [
                    'Accounts',
                    'Railroad',
                    'Land',
                    'Agriculture',
                    'Court',
                    'City',
                    'Advocate',
                    'Comptroller',
                    'Lieutenant'
                ]
                for (let filter of repIgnoreFilters) {
                    if (title.includes(filter)) {
                        continue repLoop
                    }
                }

                const rep = {};
                rep[title] = repName;
                data.reps.state.push(rep);
            }

        }
    }

    return data;
}


// logging
const logtimezone = process.env.TIMEZONE;
const logpath = process.env.LOGFILE;

const timestamp = {

  // date, time values
  data: () => {
    const date = new Date();
    const ianaTimezone = `Etc/GMT${logtimezone.replace('gmt', '')}`;
    const tz_abbr = Intl.DateTimeFormat('en-US', { timeZone: ianaTimezone, timeZoneName: 'short' }).formatToParts(date).find(part => part.type === 'timeZoneName').value;
    return {
      year: date.getFullYear(),
      month: String(date.getMonth() + 1).padStart(2, '0'),
      day: String(date.getDate()).padStart(2, '0'),
      hours: String(date.getHours() % 12 || 12).padStart(2, '0'),
      minutes: String(date.getMinutes()).padStart(2, '0'),
      seconds: String(date.getSeconds()).padStart(2, '0'),
      am_pm: date.getHours() >= 12 ? 'pm' : 'am',
      timezoneAbbr: tz_abbr,
    };
  },

  // log to console
  log: async function (req, err) {
    const d = this.data();
    const timestamp = `${err ? 'ERROR: ': ''}` +
                      `${d.year}-${d.month}-${d.day} ` + 
                      `- ${d.hours}:${d.minutes}:${d.seconds} ` +
                      `${d.am_pm} (${d.timezoneAbbr}) -- ` +
                      `${req.ip} -- ${req.method} ${req.path} ` +
                      `${err ? '\n>>>>>> ' + err : ''}`;
    console.log(timestamp);
    return timestamp;
  },

  // log to console and file
  logfile: async function (req, err) {
    const ts = this.log(req, err);
    fs.appendFile(logpath, ts + '\n', (err) => {
      if (err) console.log(`Unable to log to ${logpath}`);
    });
  }
};


module.exports = {
  timestamp,
  getRepsData,
  filterReps
};
