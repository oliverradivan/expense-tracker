const transactionsBySpace = new Map()
const keyFor = (userId, spaceId) => `${userId}:${spaceId}`

export const getCachedTransactions = (userId, spaceId) => transactionsBySpace.get(keyFor(userId, spaceId)) ?? null
export const setCachedTransactions = (userId, spaceId, rows) => transactionsBySpace.set(keyFor(userId, spaceId), rows)
export const clearTransactionCache = () => transactionsBySpace.clear()
