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
      app = config.app || 'https://app.askkodiak.com', // web app base url to build links in results
      init = (async () => { // eslint-disable-line no-unused-vars
        if (url) {
          await ak.init(gid, key, url); // init ask kodiak api with url
        } else {
          await ak.init(gid, key); // init ask kodiak api
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
          // eslint-disable-next-line no-console
          console.log(`\nError in test file, row ${rowNum}: ${validationResults.error.message}\n`.bold.red);
          process.exit(-1);
        }

      }

      return tests;
    },
    setApiOpts = (test) => {
      var optionalProps = { // test props mapped to API keys
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

      // assign test Naics to correct property depending on what it is (code vs group)
      if (test.code.length === 32) {
        // this is an md5 hash
        opts.naicsCodes = test.code;
      } else {
        // this is not an md5 hash (e.g. a 2-6 digit code)
        opts.naicsGroups = test.code;
      }

      Object.keys(optionalProps).forEach((testKey) => {
        if (typeof test[testKey] !== 'undefined') {
          let apiKey = optionalProps[testKey];
          opts[apiKey] = test[testKey];
        }
      });

      test.apiOpts = opts;
    },
    runTest = async (test) => {
      const setOpts = (() => { // eslint-disable-line no-unused-vars
              setApiOpts(test);
            })(),
            productsForCodeResults = await ak.get(`products/class-code/naics/${test.code}`, test.apiOpts), // render product in list given these conditions.
            productResults = await ak.get(`product/${pid}`, test.apiOpts); // render product in singleton view under these conditions. will help us identify rules that eliminated the product from former calls

      return {
        forCode: productsForCodeResults,
        getProduct: productResults
      };
    },
    runTests = async () => {
      var results = [],
          tests = await getTestsArr(),
          rows = tests.length,
          i = 0;

      // eslint-disable-next-line no-console
      console.info(`\nchecking ${colors.green(rows)} rows. please stand by.\n`);

      // start the progress bar with a total value of row count and start value of 0
      progressBar.start(rows, 0);

      for (const test of tests) {
        let rowNum = i + 2; // zero based, accommodate header

        try {
          let response = await runTest(test),
              productMeta = response.getProduct.meta || {},
              ruleStats = productMeta['rule-stats'] || {},
              triggered = Object.keys(ruleStats.triggered || {}); //get these from the single product call so we get the rules that eliminate as well as those that alter.

          results.push({
            pid: pid,
            gid: gid,
            app: app,
            test: test,
            response: response.forCode,
            triggered: triggered,
            rowNum: rowNum
          });

          i++;
          progressBar.update(i);
        } catch (error) {
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
