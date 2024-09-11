import { Browser, chromium, Page } from '@playwright/test';
import playwright from 'playwright';
import { ConfigData, CustomLogger, DmsConfigData, DmsErrorData, DonationDataRow, NonValunteerDataRow, RecordData } from './types.js';
import { DmsConfig, VmsConfig } from './config.js';
import { getNonVolunteerData, getVolunteerData } from './excel.js';
import { formatAmountToMoney, getDonationData } from './excel-dms.js';
import { promises as fs } from 'fs';
import path from 'path';

export class VmsBrowser {
    // required to call the init function
    page!: Page;
    browser!: Browser;

    public static async getVmsBrowser(vmsConfig: VmsConfig, logger: CustomLogger) {
        const browser = new VmsBrowser(vmsConfig, logger);
        await browser.init();

        return browser;
    }

    private constructor(private _vmsConfig: VmsConfig, private logger: CustomLogger) {}

    // get userId() {
    //     return this._vmsConfig.userId;
    // }
    // get password() {
    //     return this._vmsConfig.password;
    // }

    async init() {
        if (this._vmsConfig.params.runAutomation) {
            this.browser = await chromium.launch({
                headless: false,
            });
            const context = await this.browser.newContext();
            this.page = await context.newPage();
            // return { page, browser };
        }
    }

    debugConfig() {
        console.log('Login Url:::', this._vmsConfig.loginUrl);

        console.log('Event Id:::', this.excelData.configData.eventId);

        // console.log('Reg SGNumber Url:::', this._vmsConfig.getUrlVolRegSearchBySgNumber(this.excelData.configData.eventId, 'sgNumber'));
        // console.log('Reg Phone No Url:::', this._vmsConfig.getUrlVolRegSearchByPhone(this.excelData.configData.eventId, 'phone'));

        // console.log('Att Event Id Url:::', this._vmsConfig.getUrlVolAttByEvent(this.excelData.configData.eventId));
        // console.log('Att Phone No Url:::', this._vmsConfig.getUrlVolAttByPhone(this.excelData.configData.eventId, 'sgNumber'));
    }

    async login() {
        await this.page.goto(this._vmsConfig.loginUrl);

        await this.page.fill('input[name="user[user_code]"]', this._vmsConfig.userId);
        await this.page.fill('input[name="user[password]"]', this._vmsConfig.password);
        await this.page.click('input[name="commit"]');
    }

    async logoff() {
        await this.page.click('p.name');
        await this.page.click('//span[normalize-space(text())="Log Out 登出"]');

        // await this.page.waitForTimeout(2000);
        await this.browser.close();
    }

    private excelData!:
        | {
              sheetData: RecordData[];
              configData: ConfigData;
          }
        | {
              sheetData: NonValunteerDataRow[];
              configData: ConfigData;
          };

    async getData() {
        const dataFilePath = path.resolve(this._vmsConfig.dataFileName); // Path to the Excel file

        this.excelData = this._vmsConfig.params.isVolunteer
            ? await getVolunteerData(this._vmsConfig.dataFileName, this._vmsConfig.worksheetName)
            : await getNonVolunteerData(this._vmsConfig.dataFileName, this._vmsConfig.worksheetName);

        this.logger.log(`Excel File: ${dataFilePath}`);
        this.logger.log(`Worksheet: ${this._vmsConfig.worksheetName}`);
        if (this._vmsConfig.params.isDebug) {
            this.logger.logFile(this.excelData);
        }

        return this.excelData;
    }

    async volunteerRegistration() {
        const dataRows: RecordData[] = this.excelData.sheetData as RecordData[];

        for (const row of dataRows) {
            if (row.sgNumber.startsWith('SG00')) {
                // search by sgNumber
                await this.page.goto(this._vmsConfig.getUrlVolRegSearchBySgNumber(this.excelData.configData.eventId, row.sgNumber));
            } else {
                // search by phone
                await this.page.goto(this._vmsConfig.getUrlVolRegSearchByPhone(this.excelData.configData.eventId, row.sgNumber));
            }

            try {
                // checked the first checkbox to select the record
                // if no record found, timeout error
                await this.page.locator('(//input[@name="volunteer_ids[]"])[1]').click({
                    timeout: 500,
                });

                // submit for registration
                await this.page.locator('id=add-to-registration').click();
            } catch (error) {
                if (error instanceof playwright.errors.TimeoutError) {
                    // Do something if this is a timeout.
                    // const timeoutError = error;
                    console.error(`=== ${error.name} === ${JSON.stringify(row)}`);
                } else {
                    console.log(`=== unhandle error === ${JSON.stringify(row)}`);
                    console.log(error);
                }
            }
        }

        await this.page.waitForTimeout(500);
    }

    async volunteerAttendance() {
        const dataRows: RecordData[] = this.excelData.sheetData as RecordData[];

        for (const row of dataRows) {
            if (row.sgNumber.startsWith('SG00')) {
                // attendance using barcode
                await this.page.goto(this._vmsConfig.getUrlVolAttByEvent(this.excelData.configData.eventId));

                await this.page.locator('id=barcode').fill(row.sgNumber);

                // await page.waitForTimeout(5000);
            } else {
                // navigate to 'Add Attendance 增添签到' page and search by phone
                await this.page.goto(this._vmsConfig.getUrlVolAttByPhone(this.excelData.configData.eventId, row.sgNumber));

                try {
                    // select first checkbox
                    await this.page.locator('(//input[@name="volunteer_ids[]"])[1]').click();

                    // click on 'Add to Attendance'
                    await this.page.locator('.no-margin').click();
                } catch (error) {
                    // console.log(error);
                    if (error instanceof playwright.errors.TimeoutError) {
                        // Do something if this is a timeout.
                        // const timeoutError = error;
                        console.error(`=== ${error.name} === ${JSON.stringify(row)}`);
                    } else {
                        console.log(`=== unhandle error === ${JSON.stringify(row)}`);
                        console.log(error);
                    }
                }
            }

            await this.page.waitForTimeout(1000);
        }
    }

    private async nonVolunteer(url: string) {
        const dataRows: NonValunteerDataRow[] = this.excelData.sheetData as NonValunteerDataRow[];

        for (const row of dataRows) {
            await this.page.goto(url);

            await this.page.locator('id=attendance_english_name').fill(row.engName);
            await this.page.locator('id=attendance_chinese_name').fill(row.chineseName);

            await this.page.locator('id=attendance_identity_number').click();
            await this.page.locator('id=attendance_identity_number').selectOption(row.identification);

            await this.page.locator('id=attendance_contact_number').fill(row.phone);

            await this.page.locator('span.filter-option.pull-left').click();
            if (row.gender.toUpperCase() === 'F') {
                // await page.locator("(//ul[@role='menu']//a)[3]").click();
                // await page.locator("//span[normalize-space(text())='Female 女']").click();
                await this.page.locator('//li[contains(.,"Female 女")]').click();
            } else {
                // await page.locator("//li[@class='selected']//a[1]").click();
                // await page.locator("//span[normalize-space(text())='Male 男']").click();
                await this.page.locator('//li[contains(.,"Male 男")]').click();
            }

            await this.page.locator('[name="commit"]').click();

            // await this.page.waitForTimeout(2000);
        }
    }

    async nonVolunteerRegistration() {
        await this.nonVolunteer(this._vmsConfig.getUrlNonVolReg(this.excelData.configData.eventId));
    }

    async nonVolunteerAttendance() {
        await this.nonVolunteer(this._vmsConfig.getUrlNonVolAtt(this.excelData.configData.eventId));
    }

    async executeAutomation() {
        if (this._vmsConfig.params.isVolunteer) {
            if (this._vmsConfig.params.isRegistration) {
                await this.volunteerRegistration();
            }

            if (this._vmsConfig.params.isAttendance) {
                await this.volunteerAttendance();
            }
        }

        if (this._vmsConfig.params.isNonVolunteer) {
            if (this._vmsConfig.params.isRegistration) {
                await this.nonVolunteerRegistration();
            }

            if (this._vmsConfig.params.isAttendance) {
                await this.nonVolunteerAttendance();
            }
        }
    }
}

// export async function getContext() {
//     const browser = await chromium.launch({
//         headless: false,
//     });
//     const context = await browser.newContext();
//     const page = await context.newPage();
//     return { page, browser };
// }

// export async function login(page: Page, userId: string, password: string) {
//     await page.goto('https://compasstcsgvms.tzuchi.org.sg/users/sign_in');

//     await page.fill('input[name="user[user_code]"]', userId);
//     await page.fill('input[name="user[password]"]', password);
//     await page.click('input[name="commit"]');
// }

// export async function logoff(page: Page, browser: Browser) {
//     await page.click('p.name');
//     await page.click('//span[normalize-space(text())="Log Out 登出"]');

//     //   await page.waitForTimeout(2000);

//     browser.close();
// }

// export async function volunteerRegistration(page: Page, eventId: string, dataRows: RecordData[]) {
//     // await page.goto(`https://compasstcsgvms.tzuchi.org.sg/activity/registrations/new?id=${eventId}`);

//     for (const row of dataRows) {
//         if (row.sgNumber.startsWith('SG00')) {
//             // await page.fill('input[name="volunteer_id"]', row.sgNumber);
//             // await page.locator("[name='contact_number']").fill('');

//             await page.goto(`https://compasstcsgvms.tzuchi.org.sg/activity/registrations/new?id=${eventId}&volunteer_id=${row.sgNumber}`);
//         } else {
//             // await page.fill('input[name="volunteer_id"]', '');
//             // await page.locator("[name='contact_number']").fill(row.sgNumber);

//             await page.goto(`https://compasstcsgvms.tzuchi.org.sg/activity/registrations/new?id=${eventId}&contact_number=${row.sgNumber}`);
//         }

//         try {
//             // select the record
//             await page.locator('(//input[@name="volunteer_ids[]"])[1]').click({
//                 timeout: 500,
//             });

//             // submit
//             await page.locator('id=add-to-registration').click();
//         } catch (error) {
//             if (error instanceof playwright.errors.TimeoutError) {
//                 // Do something if this is a timeout.
//                 const timeoutError = error as playwright.errors.TimeoutError;
//                 console.error(`=== ${timeoutError.name} === ${JSON.stringify(row)}`);
//             } else {
//                 console.log(`=== unhandle error === ${JSON.stringify(row)}`);
//                 console.log(error);
//             }
//         }
//     }

//     await page.waitForTimeout(500);
// }

// export async function volunteerAttendance(page: Page, eventId: string, dataRows: RecordData[]) {
//     for (const row of dataRows) {
//         if (row.sgNumber.startsWith('SG00')) {
//             // await page.goto(`https://compasstcsgvms.tzuchi.org.sg/admin/attendance/events/${eventId}/attendances/new?&event_id=${eventId}&volunteer_id=${row.sgNumber}`);
//             await page.goto(`https://compasstcsgvms.tzuchi.org.sg/admin/attendance/events/${eventId}/attendances/list`);

//             await page.locator('id=barcode').fill(row.sgNumber);

//             // await page.waitForTimeout(5000);
//         } else {
//             // navigate to 'Add Attendance 增添签到' page
//             await page.goto(`https://compasstcsgvms.tzuchi.org.sg/admin/attendance/events/${eventId}/attendances/new?&event_id=${eventId}&contact_number=${row.sgNumber}`);

//             try {
//                 // select first checkbox
//                 await page.locator('(//input[@name="volunteer_ids[]"])[1]').click();

//                 // click on 'Add to Attendance'
//                 await page.locator('.no-margin').click();
//             } catch (error) {
//                 // console.log(error);
//                 if (error instanceof playwright.errors.TimeoutError) {
//                     // Do something if this is a timeout.
//                     const timeoutError = error as playwright.errors.TimeoutError;
//                     console.error(`=== ${timeoutError.name} === ${JSON.stringify(row)}`);
//                 } else {
//                     console.log(`=== unhandle error === ${JSON.stringify(row)}`);
//                     console.log(error);
//                 }
//             }
//         }

//         await page.waitForTimeout(1000);
//     }

//     // await page.waitForTimeout(5000);
//     // console.warn('after select event')
// }

// export async function nonVolunteerRegistration(page: Page, eventId: string, dataRows: NonValunteerDataRow[]) {
//     // for (const row of dataRows) {
//     //     await page.goto(`https://compasstcsgvms.tzuchi.org.sg/activity/public_registrations/new?id=${eventId}`);

//     //     await page.locator('id=attendance_english_name').fill(row.engName);
//     //     await page.locator('id=attendance_chinese_name').fill(row.chineseName);

//     //     await page.locator('id=attendance_identity_number').click();
//     //     await page.locator('id=attendance_identity_number').selectOption(row.identification);

//     //     await page.locator('id=attendance_contact_number').fill(row.phone);

//     //     await page.locator('span.filter-option.pull-left').click();
//     //     if (row.gender.toUpperCase() === 'F') {
//     //         // await page.locator("(//ul[@role='menu']//a)[3]").click();
//     //         // await page.locator("//span[normalize-space(text())='Female 女']").click();
//     //         await page.locator("//li[contains(.,'Female 女')]").click();
//     //     } else {
//     //         // await page.locator("//li[@class='selected']//a[1]").click();
//     //         // await page.locator("//span[normalize-space(text())='Male 男']").click();
//     //         await page.locator("//li[contains(.,'Male 男')]").click();
//     //     }

//     //     await page.locator("[name='commit']").click();

//     //     // await page.waitForTimeout(2000);
//     // }

//     const tergetUrl = `https://compasstcsgvms.tzuchi.org.sg/activity/public_registrations/new?id=${eventId}`;
//     await nonVolunteer(page, tergetUrl, dataRows);
// }

// async function nonVolunteer(page: Page, url: string, dataRows: NonValunteerDataRow[]) {
//     for (const row of dataRows) {
//         await page.goto(url);

//         await page.locator('id=attendance_english_name').fill(row.engName);
//         await page.locator('id=attendance_chinese_name').fill(row.chineseName);

//         await page.locator('id=attendance_identity_number').click();
//         await page.locator('id=attendance_identity_number').selectOption(row.identification);

//         await page.locator('id=attendance_contact_number').fill(row.phone);

//         await page.locator('span.filter-option.pull-left').click();
//         if (row.gender.toUpperCase() === 'F') {
//             // await page.locator("(//ul[@role='menu']//a)[3]").click();
//             // await page.locator("//span[normalize-space(text())='Female 女']").click();
//             await page.locator('//li[contains(.,"Female 女")]').click();
//         } else {
//             // await page.locator("//li[@class='selected']//a[1]").click();
//             // await page.locator("//span[normalize-space(text())='Male 男']").click();
//             await page.locator('//li[contains(.,"Male 男")]').click();
//         }

//         await page.locator('[name="commit"]').click();

//         // await page.waitForTimeout(2000);
//     }
// }

// export async function nonVolunteerAttendance(page: Page, eventId: string, dataRows: NonValunteerDataRow[]) {
//     const tergetUrl = `https://compasstcsgvms.tzuchi.org.sg/admin/attendance/events/${eventId}/public_attendances/new`;
//     await nonVolunteer(page, tergetUrl, dataRows);
// }

// // barcode attendance
// // https://compasstcsgvms.tzuchi.org.sg/admin/attendance/events/${eventId}/attendances/list
// // await page.locator("id=barcode").fill(roe.sgNumber);

export class DmsBrowser {
    // required to call the init function
    page!: Page;
    browser!: Browser;

    public static getBrowser(dmsConfig: DmsConfig, logger: CustomLogger) {
        const browser = new DmsBrowser(dmsConfig, logger);
        // await browser.init();

        return browser;
    }

    private constructor(private _dmsConfig: DmsConfig, private _logger: CustomLogger) {}

    private async init() {
        if (this._dmsConfig.runAutomation) {
            this.browser = await chromium.launch({
                headless: false,
            });
            const context = await this.browser.newContext();
            this.page = await context.newPage();
        }
    }

    async executeAutomation() {
        const logger = this._logger;

        await this.init();

        // const config: DmsConfigData = {
        //     sgNumber: 'SG002918',
        //     subName: 'Lim Ming Tat',
        //     subEmail: 'mingtat.lim@outlook.com',
        // };

        // const DataRows: DonationDataRow[] = [
        //     {
        //         fullName: 'Low Yean Hwa',
        //         chineseName: '罗艳华',
        //         phoneNo: '94310881',
        //         amount: 1.25,
        //         gender: 'F',
        //     },
        //     {
        //         fullName: 'Lim Ming Tat',
        //         chineseName: '林明达',
        //         phoneNo: '90599967',
        //         amount: 1.75,
        //         gender: 'M',
        //     },
        // ];

        const page = this.page;

        for (const row of this.excelData.sheetData) {
            await page.goto(this._dmsConfig.dmsPortalUrl);

            // payment type
            // tab1 - paynow
            await page.locator('//label[@for="tab1"]').click();
            // // tab2 - Other Ways to Donate
            // await page.locator('//label[@for="tab2"]').click();

            // donation type:
            // #first - Individual
            // #second - coperate
            // #third - Anonymous
            // await this.page.waitForTimeout(5000);
            await page.click('//a[@href="#first"]');
            // await page.click('//a[@href="#second"]');
            // await page.locator('//a[@href="#third"]').click();

            // set donation amount
            // await page.locator('id=DonationAmount').fill(row.amount.toString());
            await page.fill('id=DonationAmount', row.amount.toString());

            // select donate frequency
            // await page.click('id=donatemonthly');
            await page.click('id=donateonce');

            // select donation option
            await page.click('id=donationforothers');
            // await page.click('id=donationformyself');

            let genderCode = '1';
            if (row.gender.toLowerCase() === 'f') {
                genderCode = '2';
            }

            // set salutation
            await page.locator('(//select[contains(@class,"single-input mt-10")]/following-sibling::div)[2]').click();
            await page.click(`//select[@id="con_Salutation"]/following-sibling::*[1]/ul/li[@data-value="${genderCode}"]`);

            await page.fill('id=fname', row.fullName);
            await page.fill('id=lname', row.chineseName);
            await page.fill('id=mobile', row.phoneNo);

            await page.click('id=IsTaxDetect');

            await page.fill('id=txtVolunteerAppID', this.excelData.configData.sgNumber);

            await page.fill('id=submitterFirstName', this.excelData.configData.subName);
            await page.fill('id=submitteremailaddress', this.excelData.configData.subEmail);

            if (this._dmsConfig.captureScreenshot) {
                // printscreen...
                await page.screenshot({ path: `${logger.screenshotFolder}/screenshot.png`, fullPage: true });
                // await page.locator('id=DonateNow').screenshot({ path: 'screenshot.png' });
            }

            await page.click('id=btn_submit');
            console.log('submited, please wait...');

            const refNo = await page.locator('//div[@class="header-info"]/div[@class="header-info__invoice"]').innerText();
            logger.log('Please make PayNow payment for', refNo, '... in 30 seconds');

            if (this._dmsConfig.captureScreenshot) {
                // rwname printscreen...
                void fs.rename(`${logger.screenshotFolder}/screenshot.png`, `${logger.screenshotFolder}/${refNo}-details.png`);
            }

            // expand Paynow section
            await page.locator('//div[@class="main-control"]/div[@class="accordion"]/div[3]').click();

            // show PayNow QR
            await page.locator('//form/div[@class="form-component"]/button[2]').click();

            try {
                // wait for PayNow payment,max 30 seconds
                // await driver.wait(until.elementLocated(By.xpath('//div[@class="payment-result-modal__body"]/p/span/b')), 30000);
                logger.console('30 seconds PayNow wait...');
                await page.locator('//div[@class="payment-result-modal__body"]/p/span/b').waitFor({ state: 'visible', timeout: 30000 });

                if (this._dmsConfig.captureScreenshot) {
                    // printscreen...
                    await page.screenshot({ path: `${logger.screenshotFolder}/${refNo}.png`, fullPage: true });
                }

                logger.log('Payment Successful for', refNo);
            } catch (error) {
                if (error instanceof playwright.errors.TimeoutError) {
                    // Do something if this is a timeout.
                    // const timeoutError = error as playwright.errors.TimeoutError;

                    logger.log('Payment failed for', refNo, '=== Wait for 30 seconds, timeout... ===');
                    logger.log(`=== ${error.name} === ${JSON.stringify(row)}`);
                } else {
                    logger.log(`=== unhandle error === ${JSON.stringify(row)}`);
                    logger.log((error as Error).message);
                }
            }
        }

        // console.log('25 seconds wait...');
        // await this.page.waitForTimeout(25000);
        void this.browser.close();
    }

    private excelData!: {
        sheetData: DonationDataRow[];
        configData: DmsConfigData;
        totalAmount: number;
        totalRecord: number;
        isErrorFound: boolean;
        errorMessages: DmsErrorData[];
    };

    async getData() {
        const logger = this._logger;

        // const dataFilePath = path.resolve('./data/data.xlsx'); // Path to the Excel file
        const dataFilePath = path.resolve(this._dmsConfig.fileName); // Path to the Excel file

        await fs.access(dataFilePath); // Check if the file exists
        this.excelData = await getDonationData(dataFilePath);

        logger.log(`Excel File: ${dataFilePath}`);
        if (this._dmsConfig.isDebug) {
            logger.logFile('Data from Excel');
            logger.logFile(this.excelData);
        }

        if (this.excelData.errorMessages.length > 0) {
            logger.logFile('Errors Details:');
            logger.logFile(this.excelData.errorMessages);
            logger.log('There are errors in the data. Please rectify the errors and rerun the process.');
            logger.console(`Log File: ${logger.name}`);

            // logger.logFile('=== Execution End with Errors ===');

            throw Error('Excel Data validation exception');
        }

        if (!this.excelData.isErrorFound) {
            logger.log(`No of Donors: ${this.excelData.sheetData.length.toString()}`);
            logger.log(`Total Amount: ${formatAmountToMoney(this.excelData.totalAmount)}`);

            if (!this._dmsConfig.runAutomation) {
                logger.log('Data validation only, no execution.');
            }
        }

        return this.excelData;
    }
}
