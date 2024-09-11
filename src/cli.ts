import { Command, Option, OptionValues } from 'commander';
import { DmsConfig, VmsConfig } from './config.js';
import { DmsBrowser, VmsBrowser } from './browser.js';
import { CustomLogger, DmsParams, VmsParams } from './types.js';
import { promptUser } from './excel-dms.js';

const program = new Command();

function baseCommand(command: Command) {
    command
        .version('1.0.0', '-v, --version')
        .description('Browser UI Automation CLI');
        // .option('-d, --debug', 'output debugging information', false)
        // .option('-r, --run-automation', 'perform UI automation', false);

        // .option('-x, --donation', 'perform donation', false)
    // .option('-c, --volunteer', 'volunteer', false)
    // .option('-n, --non-volunteer', 'non-volunteer', false)
    // .addOption(new Option('-o, --option-type <type...>', 'option type').choices([ 'vol', 'non']).makeOptionMandatory(true))
    // .addOption(new Option('-o, --option-type <type...>', 'option type').choices([ 'reg', 'att']).makeOptionMandatory(true))
    // .option('-r, --registration', 'perform registration', false)
    // .option('-a, --attendance', 'perform attendance', false)
}

function vmsCommand(command: Command) {
    command
        .command('vms')
        .description('VMS Automation Command')

        .option('-f, --file-name <file-name>', 'excel file name')

        .option('-d, --debug', 'output debugging information', false)
        .option('-r, --run-automation', 'perform UI automation', false)

        .addOption(new Option('-o, --volunteer-type <type>', 'volunteer type').choices(['volunteer', 'non-volunteer', 'vol', 'non']).makeOptionMandatory(true))
        .addOption(new Option('-a, --action-type <type>', 'action type').choices(['registration', 'attendance', 'reg', 'att']).makeOptionMandatory(true))

        .action((options: OptionValues) => {
            const logsRootPath = './logs';
            const logger = new CustomLogger(logsRootPath);

            void (async function () {
                const params = new VmsParams(command.opts(), options);
                const config = new VmsConfig(params);

                if (params.isDebug) console.log(`vms params - ${JSON.stringify(params, null, 4)}`);

                // actions
                const chromeBrowser = await VmsBrowser.getVmsBrowser(config, logger);

                await chromeBrowser.getData();
                // console.warn('getData');

                // console.warn('isDebug', params.isDebug);
                if (params.isDebug) chromeBrowser.debugConfig();

                // automation
                if (params.runAutomation) {
                    // console.warn('automation');
                    await chromeBrowser.login();
                    await chromeBrowser.executeAutomation();
                    await chromeBrowser.logoff();
                }
            })();
        });
}

function dmsCommand(command: Command) {
    command
        .command('dms')
        .description('DMS Automation Command')

        .option('-f, --file-name <file-name>', 'excel file name')
        .option('-d, --debug', 'output debugging information', false)
        .option('-r, --run-automation', 'perform UI automation', false)
        .option('-s, --screenshot', 'take screenshot', false)
        // .addOption(new Option('-o, --volunteer-type <type>', 'volunteer type').choices(['volunteer', 'non-volunteer', 'vol', 'non']).makeOptionMandatory(true))
        // .addOption(new Option('-a, --action-type <type>', 'action type').choices(['registration', 'attendance', 'reg', 'att']).makeOptionMandatory(true))

        .action((options: OptionValues) => {
            const logsRootPath = './logs';
            const logger = new CustomLogger(logsRootPath);

            void (async function () {
                try {
                    const params = new DmsParams(command.opts(), options);
                    const config = new DmsConfig(params);

                    if (params.isDebug) logger.log(`dms params - ${JSON.stringify(params, null, 4)}`);

                    const chromeBrowser = DmsBrowser.getBrowser(config, logger);

                    logger.log('=== Execution Start ===');

                    await chromeBrowser.getData();

                    // automation
                    if (params.runAutomation) {
                        // console.warn('automation');
                        // detailsLogs.log(`No of Donors: ${data.sheetData.length}`);
                        // detailsLogs.log(`Total Amount: ${formatAmountToMoney(data.totalAmount)}`);

                        promptUser()
                            .then(async () => {
                                // Proceed with the next steps here
                                logger.console('Proceed to donation execution. Please do not touch the mouse and keyboard.');

                                await chromeBrowser.executeAutomation();

                                logger.logFile('=== Execution End ===');
                                console.warn('=== Execution Completed ===');
                            })
                            .catch((error: unknown) => {
                                // Handle the error or terminate the program
                                logger.log((error as Error).message);
                                // detailsLogs.logFile(error);
                                if ((error as Error).message === 'User cancelled the process.') {
                                    logger.logFile('=== Execution End ===');
                                } else {
                                    logger.logFile('=== Execution End with Errors ===');
                                }
                                console.warn('=== Execution Completed ===');

                                // process.exit(1); // Terminate the program
                            });
                    } else {
                        logger.logFile('=== Execution End ===');
                        console.warn('=== Execution Completed ===');
                    }
                } catch (error) {
                    logger.log((error as Error).message);
                    logger.logFile('=== Execution End with Errors ===');
                    console.warn('=== Execution Completed ===');
                }
            })();
        });
}

baseCommand(program);
vmsCommand(program);
dmsCommand(program);

program.parse();

// const cli = program.opts();
// if (cli.debug as boolean) console.log(`global params - ${JSON.stringify(cli, null, 4)}`);
