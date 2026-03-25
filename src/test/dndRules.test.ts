import { describe, it, expect } from 'vitest';
import { getModifier, rollDice, rollD20, getProficiencyBonus } from '../../services/dndRules';

describe('dndRules', () => {
  describe('getModifier', () => {
    it('should return correct modifier for score 10', () => {
      expect(getModifier(10)).toBe(0);
    });

    it('should return correct modifier for score 8', () => {
      expect(getModifier(8)).toBe(-1);
    });

    it('should return correct modifier for score 16', () => {
      expect(getModifier(16)).toBe(3);
    });
  });

  describe('getProficiencyBonus', () => {
    it('should return 2 for level 1', () => {
      expect(getProficiencyBonus(1)).toBe(2);
    });

    it('should return 3 for level 5', () => {
      expect(getProficiencyBonus(5)).toBe(3);
    });
  });

  describe('rollDice', () => {
    it('should roll 1d6 correctly', () => {
      const result = rollDice(6, 1);
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(6);
    });
  });

  describe('rollD20', () => {
    it('should return result between 1 and 20', () => {
      const { result } = rollD20();
      expect(result).toBeGreaterThanOrEqual(1);
      expect(result).toBeLessThanOrEqual(20);
    });
  });
});
