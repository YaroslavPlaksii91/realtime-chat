import { User } from "./types";

export const getUsersInChannel = (channel: string, users: Record<string, User>) =>
    Object.values(users)
        .filter(user => user.channel === channel)
        .map(user => user.name)
