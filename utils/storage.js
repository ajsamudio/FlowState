// LocalStorage key for PocketWatch data
const STORAGE_KEY = 'pocketwatch_data';

// Category keywords for auto-suggestion
const categoryKeywords = {
  'Food': ['starbucks', 'mcdonalds', 'subway', 'chipotle', 'pizza', 'burger', 'restaurant', 'cafe', 'coffee', 'lunch', 'dinner', 'breakfast', 'groceries', 'walmart', 'costco', 'trader', 'whole foods', 'doordash', 'ubereats', 'grubhub'],
  'Utilities': ['shell', 'gas', 'electric', 'water', 'internet', 'phone', 'verizon', 'att', 't-mobile', 'comcast', 'xfinity', 'pg&e', 'utility', 'bill'],
  'Transport': ['uber', 'lyft', 'taxi', 'bus', 'metro', 'train', 'gas station', 'chevron', 'exxon', 'mobil', 'parking', 'toll'],
  'Entertainment': ['netflix', 'spotify', 'hulu', 'disney', 'hbo', 'amazon prime', 'movie', 'concert', 'game', 'steam', 'playstation', 'xbox', 'nintendo'],
  'Shopping': ['amazon', 'target', 'best buy', 'apple', 'nike', 'adidas', 'zara', 'h&m', 'clothes', 'shoes', 'electronics'],
  'Health': ['pharmacy', 'cvs', 'walgreens', 'doctor', 'hospital', 'gym', 'fitness', 'medicine', 'dental', 'vision'],
  'Subscriptions': ['subscription', 'membership', 'monthly', 'annual', 'premium'],
  'Income': ['salary', 'paycheck', 'bonus', 'freelance', 'income', 'payment received', 'deposit'],
  'Other': []
};

// Default data structure
const getDefaultData = () => ({
  transactions: [],
  settings: {
    monthlyBudget: 3000,
    savingsGoal: 5000,
    accentColor: 'emerald'
  }
});

// Get all data from localStorage
export const getData = () => {
  if (typeof window === 'undefined') return getDefaultData();

  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return getDefaultData();
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return getDefaultData();
  }
};

// Save data to localStorage
export const saveData = (data) => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Get all transactions
export const getTransactions = () => {
  const data = getData();
  return data.transactions || [];
};

// Add a new transaction
export const saveTransaction = (transaction) => {
  const data = getData();

  // Use provided date or default to now
  let transactionDate;
  if (transaction.date) {
    // Parse the date string (YYYY-MM-DD) and set to noon to avoid timezone issues
    transactionDate = new Date(transaction.date + 'T12:00:00');
  } else {
    transactionDate = new Date();
  }

  const newTransaction = {
    ...transaction,
    id: Date.now().toString(),
    createdAt: transactionDate.toISOString()
  };
  data.transactions = [newTransaction, ...data.transactions];
  saveData(data);
  return newTransaction;
};

// Delete a transaction
export const deleteTransaction = (id) => {
  const data = getData();
  data.transactions = data.transactions.filter(t => t.id !== id);
  saveData(data);
};

// Update a transaction
export const updateTransaction = (id, updates) => {
  const data = getData();
  const index = data.transactions.findIndex(t => t.id === id);

  if (index !== -1) {
    // Handle date update
    if (updates.date) {
      updates.createdAt = new Date(updates.date + 'T12:00:00').toISOString();
    }

    data.transactions[index] = {
      ...data.transactions[index],
      ...updates
    };
    saveData(data);
    return data.transactions[index];
  }
  return null;
};

// Auto-suggest category based on title
export const suggestCategory = (title) => {
  const lowerTitle = title.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => lowerTitle.includes(keyword))) {
      return category;
    }
  }

  return 'Other';
};

// Get monthly spending for current month
export const getMonthlySpending = () => {
  const transactions = getTransactions();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return transactions
    .filter(t => {
      // Use createdAt which now reflects the user-selected date
      const date = new Date(t.createdAt);
      return date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear &&
        t.type === 'expense';
    })
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
};

// Get monthly income for current month
export const getMonthlyIncome = () => {
  const transactions = getTransactions();
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return transactions
    .filter(t => {
      const date = new Date(t.createdAt);
      return date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear &&
        t.type === 'income';
    })
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
};

// Get EOY savings projection
export const getEOYSavingsData = () => {
  const transactions = getTransactions();
  const now = new Date();
  const currentYear = now.getFullYear();

  // Group transactions by month for current year
  const monthlyData = Array(12).fill(null).map((_, i) => ({
    month: i,
    income: 0,
    expenses: 0,
    savings: 0
  }));

  transactions
    .filter(t => new Date(t.createdAt).getFullYear() === currentYear)
    .forEach(t => {
      const month = new Date(t.createdAt).getMonth();
      if (t.type === 'income') {
        monthlyData[month].income += parseFloat(t.amount);
      } else {
        monthlyData[month].expenses += parseFloat(t.amount);
      }
    });

  // Calculate cumulative savings
  let cumulative = 0;
  monthlyData.forEach(m => {
    m.savings = m.income - m.expenses;
    cumulative += m.savings;
    m.cumulative = cumulative;
  });

  return monthlyData;
};

// Get settings
export const getSettings = () => {
  const data = getData();
  return data.settings || getDefaultData().settings;
};

// Update settings
export const updateSettings = (newSettings) => {
  const data = getData();
  data.settings = { ...data.settings, ...newSettings };
  saveData(data);
};

// Get all categories
export const getCategories = () => {
  return Object.keys(categoryKeywords);
};
