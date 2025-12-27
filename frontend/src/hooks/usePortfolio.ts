/**
 * Custom hook for portfolio data
 */
"use client";

import { useState, useEffect, useCallback } from "react";

interface PortfolioHolding {
  id: number;
  asset_type: string;
  asset_identifier: string;
  asset_name: string;
  invested_amount: number;
  current_value: number;
  units: number | null;
  gain_loss: number;
  gain_loss_percent: number;
  purchase_date: string;
}

interface PortfolioSummary {
  total_invested: number;
  total_current_value: number;
  total_gain_loss: number;
  total_gain_loss_percent: number;
  allocation: Record<
    string,
    {
      invested: number;
      current: number;
      percent: number;
    }
  >;
}

interface UsePortfolioReturn {
  holdings: PortfolioHolding[];
  summary: PortfolioSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  addHolding: (holding: AddHoldingRequest) => Promise<boolean>;
}

interface AddHoldingRequest {
  asset_type: string;
  asset_identifier: string;
  asset_name: string;
  invested_amount: number;
  units?: number;
  purchase_date: string;
  interest_rate?: number;
  maturity_date?: string;
  notes?: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function usePortfolio(userId: number = 1): UsePortfolioReturn {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [holdingsRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}/portfolio/holdings?user_id=${userId}`),
        fetch(`${API_BASE}/portfolio/summary?user_id=${userId}`),
      ]);

      if (!holdingsRes.ok) throw new Error("Failed to fetch holdings");
      if (!summaryRes.ok) throw new Error("Failed to fetch summary");

      const [holdingsData, summaryData] = await Promise.all([
        holdingsRes.json(),
        summaryRes.json(),
      ]);

      setHoldings(holdingsData);
      setSummary(summaryData);
    } catch (err) {
      console.error("Error fetching portfolio:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const addHolding = useCallback(
    async (holding: AddHoldingRequest): Promise<boolean> => {
      try {
        const res = await fetch(
          `${API_BASE}/portfolio/holdings?user_id=${userId}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(holding),
          }
        );

        if (!res.ok) throw new Error("Failed to add holding");

        // Refetch data
        await fetchData();
        return true;
      } catch (err) {
        console.error("Error adding holding:", err);
        return false;
      }
    },
    [userId, fetchData]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    holdings,
    summary,
    loading,
    error,
    refetch: fetchData,
    addHolding,
  };
}
