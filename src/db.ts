import sqlite3 from 'sqlite3';

const dbLocation = process.env.SQLITE_DB_LOCATION || 'default.db';

export const db = new sqlite3.Database(dbLocation);

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            nickname TEXT,
            xmtp_address TEXT
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT,
            user_id TEXT,
            body TEXT
        )
    `);
});

export interface Profile {
    id: number;
    user_id: string;
    nickname: string;
    xmtp_address: string;
}

export interface Post {
    id: number;
    nickname: string;
    user_id: string;
    body: string;
}

export async function getPosts(page = 1, pageSize = 10): Promise<Post[]> {
    const offset = (page - 1) * pageSize;
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM posts LIMIT ? OFFSET ?', [pageSize, offset], (err, rows: Post[]) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

export async function createPost(nickname: string, userId: string, body: string) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO posts (nickname, user_id, body) VALUES (?, ?, ?)', [nickname, userId, body], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID });
            }
        });
    });
}

export async function getProfiles(): Promise<Profile[]> {
    return new Promise((resolve, reject) => {
        db.all('SELECT * FROM profiles', (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows as Profile[]);
            }
        });
    });
}

export async function getProfileBynickname(nickname: string): Promise<Profile> {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM profiles WHERE nickname = ?', [nickname], (err, row: Profile) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

export async function getProfileByXmtp(address: string): Promise<Profile> {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM profiles WHERE xmtp_address = ?', [address], (err, row: Profile) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

export async function getProfileByUserId(userId: string): Promise<Profile> {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM profiles WHERE user_id = ?', [userId], (err, row: Profile) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

export async function createProfile(nickname: string, userId: string, address: string) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO profiles (nickname, user_id, xmtp_address) VALUES (?, ?, ?)', [nickname, userId, address], function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID });
            }
        });
    });
}

export async function updateProfile(profileData: Profile): Promise<void> {
    return new Promise((resolve, reject) => {
        db.run(
            'UPDATE profiles SET user_id = ?, nickname = ?, xmtp_address = ? WHERE id = ?',
            [profileData.user_id, profileData.nickname, profileData.xmtp_address, profileData.id],
            function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}