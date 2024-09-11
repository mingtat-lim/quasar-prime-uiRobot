import ExcelJS from 'exceljs';
import * as readline from 'readline';
import { DmsConfigData, DmsErrorData, DonationDataRow } from './types.js';

// export function sgISOTime() {
//     const currentDate = new Date();
//     // return currentDate.toLocaleString('en-SG', { timeZone: 'Asia/Singapore' });
//     return currentDate.toISOLocaleString();
// }

export function promptUser(): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve, reject) => {
        rl.question('Please enter Y to proceed, or press Enter to cancel: ', (answer) => {
            if (answer.toUpperCase() === 'Y') {
                // console.warn('Proceeding...');
                resolve();
            } else {
                // console.log('Invalid input. Program terminated.');
                reject(new Error('User cancelled the process.'));
            }
            rl.close();
        });
    });
}

function isValidPhone(input: string): boolean {
    // Regular expression to match exactly 8 digits
    const regex = /^\d{8}$/;

    // Test the input string against the regex
    return regex.test(input);
}

function isValidMoneyValue(input: string): boolean {
    // Regular expression to match valid money amounts
    const regex = /^\d+(\.\d{1,2})?$/;

    // Test the input string against the regex
    return regex.test(input);
}

function isValidGender(input: string): boolean {
    // Convert the input to uppercase and check if it's 'F' or 'M'
    const gender = input.toUpperCase();
    return gender === 'F' || gender === 'M';
}

function isValidChineseName(chineseName: string): boolean {
    // Check if the length of the string is 2, 3, or 4 characters
    return chineseName.length >= 2 && chineseName.length <= 4;
}

function isValidEmail(subEmail: string): boolean {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(subEmail);
}

function isValidSgNumber(sgNumber: string): boolean {
    // const sgNumberRegex: RegExp = /^[A-Za-z]{2}\d{6}$/;
    const sgNumberRegex = /^SG\d{6}$/;
    return sgNumberRegex.test(sgNumber);
}

export function formatAmountToMoney(amount: number): string {
    return new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(amount);
}

export async function getDonationData(
    filePath: string,
): Promise<{ sheetData: DonationDataRow[]; configData: DmsConfigData; totalAmount: number; totalRecord: number; isErrorFound: boolean; errorMessages: DmsErrorData[] }> {
    const errorMessages: DmsErrorData[] = [];

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const dataSheetName = 'data';

    // First sheet: Read records
    const sheet = workbook.getWorksheet(dataSheetName); // assuming the first sheet is the data
    if (sheet === undefined) {
        throw new Error(`Unable to locate worksheet: ${dataSheetName}`);
    }

    const sheetData: DonationDataRow[] = [];

    // Read headers from the first row and skip it
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header row
        const record: DonationDataRow = {
            // fullName: row.getCell(1).value?.toString() ?? '',
            // chineseName: row.getCell(2).value?.toString() ?? '',
            // phoneNo: row.getCell(3).value?.toString() ?? '',
            // amount: parseFloat(row.getCell(4).value?.toString() ?? '0'),
            // gender: row.getCell(5).value?.toString() ?? '',
            fullName: row.getCell(1).text,
            chineseName: row.getCell(2).text,
            phoneNo: row.getCell(3).text,
            amount: parseFloat(row.getCell(4).text),
            gender: row.getCell(5).text,
        };

        const errorRecord: DmsErrorData = {
            type: 'data',
            rowNumber: rowNumber - 1,
            data: record,
            message: [],
        };

        // validations
        if (record.fullName === '') {
            errorRecord.message.push('fullName is missing');
        }

        if (record.chineseName.length > 0 && !isValidChineseName(record.chineseName)) {
            errorRecord.message.push('chineseName must be 2, 3 or 4 character long');
        }

        if (!isValidPhone(record.phoneNo)) {
            errorRecord.message.push('phoneNo must be 8 digit long and conststs of number only');
        }

        if (!isValidMoneyValue(record.amount.toString())) {
            errorRecord.message.push('amount must be a valid money value with format 0.00');
        }

        if (!isValidGender(record.gender)) {
            errorRecord.message.push('gender must be "M" or "F"');
        }

        if (errorRecord.message.length > 0) {
            errorMessages.push(errorRecord);
        }

        sheetData.push(record);
    });

    // Calculate total amount
    const totalAmount = sheetData.reduce((sum, record) => sum + record.amount, 0);
    const totalRecord = sheetData.length;

    const configSheetName = 'config';

    // Second sheet: Read configuration data (assumed to be a single record)
    const condigSheet = workbook.getWorksheet(configSheetName); // assuming the second sheet is config data
    if (condigSheet === undefined) {
        throw new Error(`Unable to locate worksheet: ${configSheetName}`);
    }

    const configData: DmsConfigData = {
        // sgNumber: sheet2?.getRow(2).getCell(1).value?.toString() ?? '',
        // subName: sheet2?.getRow(2).getCell(2).value?.toString() ?? '',
        // subEmail: sheet2?.getRow(2).getCell(3).value?.toString() ?? '',
        sgNumber: condigSheet.getRow(2).getCell(1).text,
        subName: condigSheet.getRow(2).getCell(2).text,
        subEmail: condigSheet.getRow(2).getCell(3).text,
    };

    const errorRecord: DmsErrorData = {
        type: 'config',
        rowNumber: 2,
        data: configData,
        message: [],
    };

    if (configData.subName === '') {
        errorRecord.message.push('submitter name is missing');
    }

    if (!isValidSgNumber(configData.sgNumber)) {
        errorRecord.message.push('submitter SG Number is invalid');
    }

    if (!isValidEmail(configData.subEmail)) {
        errorRecord.message.push('submitter email address is invalid');
    }

    if (errorRecord.message.length > 0) {
        errorMessages.push(errorRecord);
    }

    return { sheetData, configData, totalAmount, totalRecord, isErrorFound: errorMessages.length > 0, errorMessages };
}
