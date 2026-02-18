export interface SalesData {
  date: string;
  people: {
    [name: string]: {
      acquisitionP1: number;
      acquisitionP4: number;
      offtakeP5: number;
    };
  };
}

export const parseCSV = (csvText: string): { data: SalesData[], workingDaysPerPerson: Record<string, number> } => {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',');
  
  const data: SalesData[] = [];
  const workingDaysPerPerson: Record<string, number> = {};
  
  // People start from index 1 (B column) to 15 (P column)
  const peopleIndices = [
    { name: 'Maria Tasiou', start: 1 },
    { name: 'Nikos Mousas', start: 4 },
    { name: 'Giwrgos Grimanis', start: 7 },
    { name: 'Nikolas Panoutsopoulos', start: 10 },
    { name: 'Nefeli Merko', start: 13 },
  ];

  peopleIndices.forEach(p => workingDaysPerPerson[p.name] = 0);

  // Data rows differ per file, so we iterate until we hit "TOTAL:"
  for (let i = 2; i < lines.length; i++) {
    const row = lines[i].split(',');
    if (!row[0] || row[0].startsWith('TOTAL')) break;

    const entry: SalesData = {
      date: row[0],
      people: {}
    };

    peopleIndices.forEach(person => {
      // Check if this person has data for this day (is a working day)
      // We check the first column (Acquisition P1) for a value
      const hasData = row[person.start] !== undefined && row[person.start].trim() !== '';
      
      if (hasData) {
        workingDaysPerPerson[person.name] = (workingDaysPerPerson[person.name] || 0) + 1;
      }

      entry.people[person.name] = {
        acquisitionP1: parseInt(row[person.start] || '0') || 0,
        acquisitionP4: parseInt(row[person.start + 1] || '0') || 0,
        offtakeP5: parseInt(row[person.start + 2] || '0') || 0,
      };
    });

    data.push(entry);
  }

  return { data, workingDaysPerPerson };
};

export const calculateTotals = (data: SalesData[], workingDaysMap: Record<string, number>) => {
  const totals: any = {};
  
  data.forEach(entry => {
    Object.entries(entry.people).forEach(([name, stats]) => {
      if (!totals[name]) {
        totals[name] = { 
          acquisitionP1: 0, 
          acquisitionP4: 0, 
          offtakeP5: 0,
          workingDays: workingDaysMap[name] || 0
        };
      }
      totals[name].acquisitionP1 += stats.acquisitionP1;
      totals[name].acquisitionP4 += stats.acquisitionP4;
      totals[name].offtakeP5 += stats.offtakeP5;
    });
  });
  
  return totals;
};
