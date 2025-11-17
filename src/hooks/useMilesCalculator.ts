export interface CalculatorInputs {
  milesUsed: number;
  costPerMile: number;
  boardingFee: number;
  passengers: number;
  targetMargin?: number;
  manualPrice?: number;
}

export interface CalculatorResults {
  costPerPassenger: number;
  totalCost: number;
  suggestedPrice: number;
  finalPrice: number;
  profit: number;
  profitMargin: number;
  effectiveCostPerMile: number;
  pricePerThousand: number;
}

export function useMilesCalculator(inputs: CalculatorInputs): CalculatorResults {
  const {
    milesUsed,
    costPerMile,
    boardingFee,
    passengers,
    targetMargin = 0,
    manualPrice = 0,
  } = inputs;

  // Cálculo do custo por passageiro
  const costPerPassenger = (milesUsed / 1000) * costPerMile + boardingFee;
  
  // Custo total
  const totalCost = costPerPassenger * passengers;
  
  // Preço sugerido baseado na margem desejada
  const suggestedPrice = targetMargin > 0 && targetMargin < 100
    ? totalCost / (1 - targetMargin / 100)
    : totalCost;
  
  // Preço final (manual ou sugerido)
  const finalPrice = manualPrice > 0 ? manualPrice : suggestedPrice;
  
  // Lucro
  const profit = finalPrice - totalCost;
  
  // Margem de lucro
  const profitMargin = finalPrice > 0 ? (profit / finalPrice) * 100 : 0;
  
  // Custo efetivo por milha
  const effectiveCostPerMile = milesUsed > 0 ? totalCost / milesUsed : 0;
  
  // Preço por milheiro
  const pricePerThousand = milesUsed > 0 ? (finalPrice / milesUsed) * 1000 : 0;

  return {
    costPerPassenger,
    totalCost,
    suggestedPrice,
    finalPrice,
    profit,
    profitMargin,
    effectiveCostPerMile,
    pricePerThousand,
  };
}
