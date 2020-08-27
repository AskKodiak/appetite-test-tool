const csv = require('csvtojson'),
      colors = require('colors'),
      config = (() => {
        var obj;

        try {
          obj = require('./config');
        } catch (ex) {
          // eslint-disable-next-line no-console
          console.error('please create a config file before running. see README for instructions.');
          process.exit(-1);
        }

        return obj;
      })(),
      Joi = require('joi'),
      cliProgress = require('cli-progress'),
      progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic),
      ak = require('ask-kodiak-sdk'),
      { boolean } = require('boolean'),
      key = config.key,
      gid = config.gid,
      pid = config.pid,
      url = config.url,
      init = (() => { // eslint-disable-line no-unused-vars
        if (url) {
          ak.init(gid, key, url); // init ask kodiak api with url
        } else {
          ak.init(gid, key); // init ask kodiak api
        }

      })(),
      testsPath = './tests.csv',
      testSchema = Joi.object({
        code: Joi.string().max(32).required(),
        geo: Joi.string().length(5),
        entityType: Joi.string(),
        annualPayroll: Joi.number(),
        annualRevenue: Joi.number(),
        fullTimeEmployees: Joi.number(),
        partTimeEmployees: Joi.number(),
        tiv: Joi.number(),
        vehicles: Joi.number(),
        locations: Joi.number(),
        buildings: Joi.number(),
        squareFootage: Joi.number(),
        buildingAge: Joi.number(),
        yearsInBusiness: Joi.number(),
        yearsInIndustry: Joi.number(),
        expectInAppetite: Joi.boolean().required(),
        hasAllTags: Joi.array(),
        containsAllTags: Joi.array(),
        hasAnyTags: Joi.array(),
        doesNotHaveAnyTags: Joi.array(),
        doesNotHaveAllTags: Joi.array(),
        doesNotHaveTags: Joi.boolean()
      });

var validateTest = (test) => {
      return testSchema.validate(test);
    },
    getTestsArr = async () => {
      const tagParser = (item, head, resultRow, row, colIdx) => {
              //https://www.npmjs.com/package/csvtojson#column-parser
              // turn comma separated string into array on parsing
              if (item) {
                item = item.replace(/ /g, ''); //remove all whitespace before splitting.
                item = item.split(','); // convert string to array
                return item;
              }
            },
            booleanParser = (item, head, resultRow, row, colIdx) => {
              //https://www.npmjs.com/package/csvtojson#column-parser
              // turn a string into a boolean
              if (item) {
                return boolean(item);
              }
            },
            tests = await csv({
              ignoreEmpty: true,
              colParser: {
                'expectInAppetite': booleanParser,
                // handle tag values specially when parsing csv
                'hasAllTags': tagParser,
                'containsAllTags': tagParser,
                'hasAnyTags': tagParser,
                'doesNotHaveAnyTags': tagParser,
                'doesNotHaveAllTags': tagParser,
                'doesNotHaveTags': booleanParser
              }
            }).fromFile(testsPath);

      for (let i = 0; i < tests.length; i++) {
        let test = tests[i],
            rowNum = i + 1,
            validationResults = validateTest(test);

        if (validationResults.error) {
          throw new Error(`Error in Row ${rowNum}: ${validationResults.error.message}`);
        }

      }

      return tests;
    },
    setApiOpts = (test) => {
      var props = { // test props mapped to API keys
            'geo': 'geos',
            'entityType': 'entityTypes',
            'annualPayroll': 'annualPayroll',
            'annualRevenue': 'annualRevenue',
            'fullTimeEmployees': 'fullTimeEmployees',
            'partTimeEmployees': 'partTimeEmployees',
            'tiv': 'tiv',
            'locations': 'locations',
            'buildings': 'buildings',
            'squareFootage': 'squareFootage',
            'buildingAge': 'buildingAge',
            'yearsInBusiness': 'yearsInBusiness',
            'yearsInIndustry': 'yearsInIndustry'
          },
          opts = {
            products: pid // all tests scoped to individual product
          };

      Object.keys(props).forEach((testKey) => {
        if (typeof test[testKey] !== 'undefined') {
          let apiKey = props[testKey];
          opts[apiKey] = test[testKey];
        }
      });

      test.apiOpts = opts;
    },
    runTest = async (test) => {
      const setOpts = (() => { // eslint-disable-line no-unused-vars
              setApiOpts(test);
            })(),
            results = await ak.productsForCode(test.code, test.apiOpts);

      return results;
    },
    runTests = async () => {
      var results = [],
          tests = await getTestsArr(),
          rows = tests.length,
          i = 0;

      // eslint-disable-next-line no-console
      console.info(`\nchecking ${colors.green(rows)} rows. please stand by.\n`);

      // start the progress bar with a total value of 200 and start value of 0
      progressBar.start(rows, 0);

      for (const test of tests) {
        try {
          let response = await runTest(test);

          results.push({
            pid: pid,
            test: test,
            response: response,
            rowNum: i + 2 // zero based, add header
          });

          i++;
          progressBar.update(i);
        } catch (error) {
          let rowNum = i + 1;
          progressBar.stop();
          if (error.message === '404 - {"message":"class code not found.","code":"class code not found."}') {
            // eslint-disable-next-line no-console
            console.error(`ERR in row ${rowNum}: ${test.code} is not a valid NAICS Code.`);
          } else {
            // eslint-disable-next-line no-console
            console.error(`ERR in row ${rowNum}: ${error.message}`);
          }
          process.exit(-1);
        }

      }

      progressBar.stop();

      return results;

    };

exports.run = runTests;
