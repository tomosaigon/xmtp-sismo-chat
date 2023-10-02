# XMTP private relay chat 

Run an IRC (internet relay chat) channel over XMTP with this server hosting a relay at an ephemeral or static address. It serves a single shared channel which anyone can join by sending a /register command, e.g. `/register tomosaigon 0x...` after which future messages will be relayed to other subscribers as "tomosaigon", thus obfuscating the user's address. Registrations are stored in a local database. Future versions may support joining (subscribing to) multiple channels, e.g. `/join #xmtp-devs`. Server can be restarted with a new ephemeral wallet and the new relay address can be published to a select audience. Permanently destroying the party line can be accomplished by erasing the wallet and the stored user mappings.

# Usage

`npm run start`