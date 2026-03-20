export type Version = {
  uuid: string
  sha1: string
  name: string
  path: string
  scriptPath?: string
}

export type Profile = {
  name: string
  email?: string
  password?: string
  token?: string
  userId?: string
  playerUserId?: string
}
