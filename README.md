# whatsRoPlaying
(try to) discover what someone is playing on Roblox

## How to use

Download `index.js` and execute it with `node`
```
node index.js <USERNAME>
```

## How does it work

The program will check if the user is connected. If it is, it will scrap their badges list and create a list of games. Then, it will check if the user is in any of these games by comparing the user profile photo URL with the profile photo URL of the users in-game. 

## Problems

- it is very slow (it has to scrap many servers in many games)
- it won't work if the user doesn't have a badge on the game they're playing
- it won't work if the user is wearing a deleted item (they won't have a profile photo)
