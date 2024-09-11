// import { VmsBrowser } from './browser.js';
// import { VmsParams } from './types.js';
// import { VmsConfig } from './config.js';
import { DmsBrowser } from './browser.js';
import { CustomLogger, DmsParams } from './types.js';
import { DmsConfig } from './config.js';
import { formatAmountToMoney, promptUser } from './excel-dms.js';

// const params = new VmsParams(
//     {
//         debug: true,
//         runAutomation: false,
//     },
//     {
//         volunteerType: 'non-volunteer',
//         actionType: 'registration',
//     },
// );

// const config = new VmsConfig(params);

// if (params.isDebug) console.log(`vms params - ${JSON.stringify(params, null, 4)}`);

// (async function () {
//     // actions
//     const chromeBrowser = await VmsBrowser.getVmsBrowser(config);

//     await chromeBrowser.getData();
//     // console.warn('getData');

//     // automation
//     if (params.runAutomation) {
//         // console.warn('automation');
//         await chromeBrowser.login();
//         await chromeBrowser.executeAutomation();
//         await chromeBrowser.logoff();
//     }
// })();

const params = new DmsParams(
    {
        debug: true,
        runAutomation: true,
    },
    {
        screenshot: true,
    },
);

const config = new DmsConfig(params);


void (async function () {
    const logsRootPath = './logs';
    const detailsLogs = new CustomLogger(logsRootPath);

    if (params.isDebug) detailsLogs.log(`dms params - ${JSON.stringify(params, null, 4)}`);

    try {
        // actions
        const chromeBrowser = DmsBrowser.getBrowser(config, detailsLogs);

        detailsLogs.log('=== Execution Start ===');

        const data = await chromeBrowser.getData();

        // automation
        if (params.runAutomation) {
            // console.warn('automation');
            if (!data.isErrorFound) {
                detailsLogs.log(`No of Donors: ${data.sheetData.length.toString()}`);
                detailsLogs.log(`Total Amount: ${formatAmountToMoney(data.totalAmount)}`);

                promptUser()
                    .then(async () => {
                        // Proceed with the next steps here
                        detailsLogs.console('Proceed to donation execution. Please do not touch the mouse and keyboard.');

                        await chromeBrowser.executeAutomation();

                        detailsLogs.logFile('=== Execution End ===');
                        console.warn('=== Execution Completed ===');
                    })
                    .catch((error: unknown) => {
                        // Handle the error or terminate the program
                        detailsLogs.log((error as Error).message);
                        // detailsLogs.logFile(error);
                        if ((error as Error).message === 'User cancelled the process.') {
                            detailsLogs.logFile('=== Execution End ===');
                        } else {
                            detailsLogs.logFile('=== Execution End with Errors ===');
                        }
                        console.warn('=== Execution Completed ===');

                        // process.exit(1); // Terminate the program
                    });
            }
        } else {
            detailsLogs.logFile('=== Execution End ===');
            console.warn('=== Execution Completed ===');
        }
    } catch (error) {
        detailsLogs.log((error as Error).message);
        detailsLogs.logFile('=== Execution End with Errors ===');
        console.warn('=== Execution Completed ===');
    }
})();
