const USER_ID_KEY = 'finance-tracker-user-id'

export function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY)

  if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem(USER_ID_KEY, userId)
  }

  return userId
}

export function clearUserId(): void {
  localStorage.removeItem(USER_ID_KEY)
}

export { getUserId as getDeviceId, clearUserId as clearDeviceId }
