import { useState, useEffect } from 'react';
import { parseCSV, calculateTotals, SalesData } from '@/utils/csvParser';

export const useSalesData = () => {
  const [data, setData] = useState<SalesData[]>([]);
  const [totals, setTotals] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [janRes, febRes] = await Promise.all([
          fetch('/data/january.csv'),
          fetch('/data/february.csv')
        ]);

        const janText = await janRes.text();
        const febText = await febRes.text();

        const sortedJan = parseCSV(janText);
        const sortedFeb = parseCSV(febText);

        const allData = [...sortedJan.data, ...sortedFeb.data];
        
        // Aggregate working days from both months
        const combinedWorkingDays: Record<string, number> = {};
        const allNames = new Set([...Object.keys(sortedJan.workingDaysPerPerson), ...Object.keys(sortedFeb.workingDaysPerPerson)]);
        
        allNames.forEach(name => {
          combinedWorkingDays[name] = (sortedJan.workingDaysPerPerson[name] || 0) + (sortedFeb.workingDaysPerPerson[name] || 0);
        });

        setData(allData);
        setTotals(calculateTotals(allData, combinedWorkingDays));
      } catch (error) {
        console.error("Failed to load sales data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, totals, loading };
};
