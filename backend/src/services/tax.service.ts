import { Database } from '../db/database';
import { TaxBracket } from '../types';

export class TaxService {
  private db = Database.getInstance();

  public async getBrackets(): Promise<TaxBracket[]> {
    return this.db.getTaxBrackets();
  }

  public async getActiveBrackets(): Promise<TaxBracket[]> {
    const brackets = await this.db.getTaxBrackets();
    return brackets
      .filter(b => b.isActive)
      .sort((a, b) => a.minIncome - b.minIncome);
  }

  public async addBracket(bracket: Omit<TaxBracket, 'id' | 'updatedAt'>): Promise<TaxBracket> {
    const id = `TB-${Date.now().toString(36).toUpperCase()}`;
    const newBracket: TaxBracket = {
      ...bracket,
      id,
      updatedAt: new Date().toISOString()
    };
    return this.db.createTaxBracket(newBracket);
  }

  public async updateBracket(id: string, updates: Partial<TaxBracket>): Promise<TaxBracket | null> {
    return this.db.updateTaxBracket(id, updates);
  }

  /**
   * Computes withholding tax for a given monthly taxable income
   * using the currently active Tax Bracket Matrix.
   * If semi-monthly, income is normalized to monthly and result halved.
   */
  public async computeMonthlyTax(monthlyTaxableIncome: number): Promise<{
    taxAmount: number;
    bracketUsed: TaxBracket | null;
    computationDetails: string;
  }> {
    if (monthlyTaxableIncome <= 0) {
      return { taxAmount: 0, bracketUsed: null, computationDetails: 'Taxable income is zero or negative.' };
    }

    const activeBrackets = await this.getActiveBrackets();
    if (activeBrackets.length === 0) {
      // Fallback 5% if no brackets are active
      const tax = Math.round(monthlyTaxableIncome * 0.05 * 100) / 100;
      return {
        taxAmount: tax,
        bracketUsed: null,
        computationDetails: 'No active tax matrix brackets found. Applied default flat 5% deduction.'
      };
    }

    // Find the applicable bracket where minIncome <= monthlyTaxableIncome <= maxIncome
    let matchedBracket: TaxBracket | null = null;
    for (const b of activeBrackets) {
      if (monthlyTaxableIncome >= b.minIncome && monthlyTaxableIncome <= b.maxIncome) {
        matchedBracket = b;
        break;
      }
    }

    // If higher than highest bracket, use highest bracket
    if (!matchedBracket && activeBrackets.length > 0) {
      matchedBracket = activeBrackets[activeBrackets.length - 1];
    }

    if (!matchedBracket) {
      return { taxAmount: 0, bracketUsed: null, computationDetails: 'Income below all tax brackets.' };
    }

    const excess = Math.max(0, monthlyTaxableIncome - matchedBracket.minIncome);
    const variableTax = excess * matchedBracket.excessRate;
    const totalTax = Math.round((matchedBracket.baseTax + variableTax) * 100) / 100;

    return {
      taxAmount: totalTax,
      bracketUsed: matchedBracket,
      computationDetails: `Applied ${matchedBracket.name}: Base ₱${matchedBracket.baseTax.toFixed(2)} + (${(matchedBracket.excessRate * 100).toFixed(1)}% of excess ₱${excess.toFixed(2)})`
    };
  }

  /**
   * Safe decimal-rounded semi-monthly withholding tax
   */
  public async computeSemiMonthlyTax(semiMonthlyTaxableIncome: number): Promise<{
    taxAmount: number;
    bracketUsed: TaxBracket | null;
    computationDetails: string;
  }> {
    const annualizedEquivalent = semiMonthlyTaxableIncome * 2;
    const monthlyResult = await this.computeMonthlyTax(annualizedEquivalent);
    const semiMonthlyTax = Math.round((monthlyResult.taxAmount / 2) * 100) / 100;

    return {
      taxAmount: semiMonthlyTax,
      bracketUsed: monthlyResult.bracketUsed,
      computationDetails: `Semi-monthly calculated as half of monthly tax: ₱${semiMonthlyTax.toFixed(2)} (Monthly rate: ₱${monthlyResult.taxAmount.toFixed(2)})`
    };
  }
}

export const taxService = new TaxService();
