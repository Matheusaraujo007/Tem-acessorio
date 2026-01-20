
import React, { useMemo } from 'react';
import { useApp } from '../AppContext';
import { DRERow } from '../types';

const DRE: React.FC = () => {
  const { transactions } = useApp();

  const dreData = useMemo(() => {
    const incomes = transactions.filter(t => t.type === 'INCOME');
    const expenses = transactions.filter(t => t.type === 'EXPENSE');

    const totalIncome = incomes.reduce((acc, t) => acc + t.value, 0);
    const totalExpenses = expenses.reduce((acc, t) => acc + t.value, 0);
    
    // Simulação de quebra por categorias para preencher a tabela
    const sales = incomes.filter(t => t.category === 'Venda').reduce((acc, t) => acc + t.value, 0);
    const otherIncomes = totalIncome - sales;

    const inventoryCosts = expenses.filter(t => t.category === 'Compra de Estoque').reduce((acc, t) => acc + t.value, 0);
    const operationalExpenses = totalExpenses - inventoryCosts;

    const ebitda = totalIncome - totalExpenses;

    const rows: DRERow[] = [
      { label: 'RECEITA OPERACIONAL BRUTA', value: totalIncome, avPercent: 100.0, trend: 0, isSubtotal: true },
      { label: 'Vendas de Mercadorias (PDV)', value: sales, avPercent: totalIncome ? (sales / totalIncome) * 100 : 0, trend: 0, indent: true },
      { label: 'Outras Receitas / Aportes', value: otherIncomes, avPercent: totalIncome ? (otherIncomes / totalIncome) * 100 : 0, trend: 0, indent: true },
      { label: '(=) RECEITA OPERACIONAL LÍQUIDA', value: totalIncome, avPercent: 100.0, trend: 0, isSubtotal: true },
      { label: '(-) CUSTO DAS MERCADORIAS (Entradas)', value: -inventoryCosts, avPercent: totalIncome ? (inventoryCosts / totalIncome) * 100 : 0, trend: 0, isNegative: true },
      { label: '(=) LUCRO BRUTO', value: totalIncome - inventoryCosts, avPercent: totalIncome ? ((totalIncome - inventoryCosts) / totalIncome) * 100 : 0, trend: 0, isSubtotal: true },
      { label: '(-) DESPESAS OPERACIONAIS E GERAIS', value: -operationalExpenses, avPercent: totalIncome ? (operationalExpenses / totalIncome) * 100 : 0, trend: 0, isNegative: true },
      { label: '(=) RESULTADO LÍQUIDO (EBITDA)', value: ebitda, avPercent: totalIncome ? (ebitda / totalIncome) * 100 : 0, trend: 0, isSubtotal: true },
    ];

    return rows;
  }, [transactions]);

  const totalIncome = dreData[0].value;
  const netProfit = dreData[dreData.length - 1].value;
  const margin = totalIncome ? (netProfit / totalIncome) * 100 : 0;

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black tracking-tight">DRE Automatizada</h1>
          <p className="text-slate-500 text-sm">Cálculos baseados em regime de competência sincronizado com PDV e Estoque.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg text-sm font-bold"><span className="material-symbols-outlined mr-2">picture_as_pdf</span> Exportar</button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a222c] rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 dark:bg-[#111418] border-b border-slate-200 dark:border-slate-800">
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">Descrição da Conta</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">Valor (R$)</th>
              <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-right">AV %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {dreData.map((row, i) => (
              <tr key={i} className={`${row.isSubtotal ? 'bg-slate-50/50 dark:bg-slate-800/20 font-bold' : ''} hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors`}>
                <td className={`px-6 py-4 text-sm ${row.indent ? 'pl-12 text-slate-500' : ''} ${row.isNegative ? 'text-rose-500 font-bold' : ''}`}>
                  {row.label}
                </td>
                <td className={`px-6 py-4 text-sm text-right tabular-nums font-black ${row.isNegative ? 'text-rose-500' : row.isSubtotal ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                  {row.value < 0 ? `(${Math.abs(row.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})` : row.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </td>
                <td className="px-6 py-4 text-sm text-right text-slate-400 tabular-nums">
                  {row.avPercent.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SummaryCard title="Receita Total" value={`R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
        <SummaryCard title="Margem Líquida" value={`${margin.toFixed(1)}%`} subtext="Sobre faturamento" />
        <SummaryCard title="Lucro Líquido" value={`R$ ${netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ title: string; value: string; subtext?: string }> = ({ title, value, subtext }) => (
  <div className="bg-white dark:bg-[#1a222c] p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{title}</p>
    <div className="flex items-end gap-2">
      <h3 className="text-2xl font-black tabular-nums">{value}</h3>
      {subtext && <span className="text-slate-400 text-xs font-bold mb-1">{subtext}</span>}
    </div>
  </div>
);

export default DRE;
