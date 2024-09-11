import ExcelJS from 'exceljs';
import { ConfigData, NonValunteerDataRow, RecordData } from './types.js';

// Function to get the string value from a cell
// function getCellStringValue(cell: ExcelJS.Cell | undefined): string {
//     if (cell === undefined) return '';

//     console.log('==== cell text ====', cell.text, '====')

//     // Check if the cell has a formula
//     if (cell.type === ExcelJS.ValueType.Formula) {
//         // If the formula's result is a string, return the result
//         if (typeof cell.result === 'string') {
//             return cell.result;
//         }

//         // If the formula's result is a number, return the result
//         if (typeof cell.result === 'number') {
//             return cell.result.toString();
//         }
//     } else if (cell.type === ExcelJS.ValueType.String) {
//         // If the cell itself contains a string, return the string value
//         return cell.text;
//     } else if (cell.type === ExcelJS.ValueType.Number && cell.value !== undefined && cell.value) {
//         // If the cell itself contains a string, return the string value
//         // return (cell.value as number).toString();
//         console.log('==== cell number ====')
//         return cell.text;
//     }

//     // console.log('getCellStringValue', JSON.stringify(cell.type, null, 4), typeof cell.result)
//     // console.log('getCellStringValue', JSON.stringify(cell.result, null, 4))

//     throw new Error(`Failed to get value from cell type: ${cell.type.toString()} value: ${cell.value !== undefined ? JSON.stringify(cell.value) : 'undefined'}`)

//     // If it's neither a formula with a string result nor a string, return undefined
//     return '';
// }

export async function getVolunteerData(filePath: string, sheetName: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // First sheet: Read records
    const sheet = workbook.getWorksheet(sheetName);
    if (sheet === undefined) {
        throw new Error(`Unable to locate worksheet: ${sheetName}`);
    }

    const sheetData: RecordData[] = [];

    const configData: ConfigData = {
        // eventId: sheet1?.getRow(1).getCell(5).value?.toString() ?? '',
        eventId: sheet.getRow(1).getCell(5).text,
    };

    // Read headers from the first row and skip it
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            return; // Skip header row
        }

        const record: RecordData = {
            // special handling when the worksheet is using filter() function
            // sgNumber:
            //     (['string', 'number'].includes(typeof row.getCell(1).value)
            //         ? row.getCell(1).value?.toString()
            //         : row.getCell(1).result.toString()) ?? '',
            // chineseName: row.getCell(2).value?.toString() ?? '',

            sgNumber: row.getCell(1).text,
            chineseName: row.getCell(2).text,
        };

        if (record.sgNumber !== '') sheetData.push(record);
    });

    return {
        sheetData,
        configData,
        // totalAmount, totalRecord, isErrorFound: errorMessages.length > 0, errorMessages
    };
}

export async function getNonVolunteerData(filePath: string, sheetName: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // First sheet: Read records
    const sheet = workbook.getWorksheet(sheetName);
    if (sheet === undefined) {
        throw new Error(`Unable to locate worksheet: ${sheetName}`);
    }

    const sheetData: NonValunteerDataRow[] = [];

    const configData: ConfigData = {
        // eventId: sheet.getRow(1).getCell(8).value?.toString() ?? '',
        eventId: sheet.getRow(1).getCell(8).text,
    };

    // Read headers from the first row and skip it
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) {
            return; // Skip header row
        }

        const record: NonValunteerDataRow = {
            // special handling when the worksheet is using filter() function
            // engName:
            //     (['string', 'number'].includes(typeof row.getCell(1).value)
            //         ? row.getCell(1).value?.toString()
            //         : row.getCell(1).result.toString()) ?? '',
            // chineseName: row.getCell(2).value?.toString() ?? '',
            // phone: row.getCell(3).value?.toString() ?? '',
            // gender: row.getCell(4).value?.toString() ?? '',
            // identification: row.getCell(5).value?.toString() ?? '',
            engName: row.getCell(1).text,
            chineseName: row.getCell(2).text,
            phone: row.getCell(3).text,
            gender: row.getCell(4).text,
            identification: row.getCell(5).text,
        };

        if (record.engName !== '') sheetData.push(record);
    });

    return {
        sheetData,
        configData,
        // totalAmount, totalRecord, isErrorFound: errorMessages.length > 0, errorMessages
    };
}
