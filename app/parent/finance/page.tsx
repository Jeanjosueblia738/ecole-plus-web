'use client';

import { Suspense } from 'react';
import ParentFinanceInner from './finance-inner';

export default function ParentFinancePage() {
  return (
    <Suspense
      fallback={
        <div className="py-16 text-center text-sm text-gray-400">
          Chargement…
        </div>
      }
    >
      <ParentFinanceInner />
    </Suspense>
  );
}
