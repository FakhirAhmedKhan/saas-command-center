import { createCsv } from 'src/modules/analytics-reports/utils/analytics-csv';

describe('createCsv', () => {
  it('escapes quotes and commas', () => {
    const result = createCsv(
      [
        {
          header: 'Name',
          value: (row: { name: string }) => row.name,
        },
      ],
      [
        {
          name: 'Hello, "World"',
        },
      ],
    );

    expect(result).toContain('"Hello, ""World"""');
  });

  it.each(['=SUM(A1:A2)', '+1+1', '-1+1', '@IMPORT', '\tformula', '\rformula'])('protects dangerous spreadsheet values: %s', (dangerousValue) => {
    const result = createCsv(
      [
        {
          header: 'Value',
          value: (row: { value: string }) => row.value,
        },
      ],
      [
        {
          value: dangerousValue,
        },
      ],
    );

    expect(result).toContain(`"'${dangerousValue}"`);
  });
});
