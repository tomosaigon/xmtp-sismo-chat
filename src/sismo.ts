import { SismoConnect, SismoConnectConfig, SismoConnectResponse, SismoConnectVerifiedResult, AuthType } from "@sismo-core/sismo-connect-server";
    
// you will need to register an appId in the Factory
const SISMO_CONNECT_APP_ID = "0x2cc3a0560a713f648168c37919b5e7c8";
const GROUP_ID = "0x3b8e71562df9eca2edc0a94d18545257"

// const config: SismoConnectConfig = {
//     appId: SISMO_CONNECT_APP_ID,
//     vault: {
//         // For development purposes insert the Data Sources that you want to impersonate here
//         // Never use this in production
//         impersonate: [
//             // EVM
//             "leo21.sismo.eth",
//             "0xA4C94A6091545e40fc9c3E0982AEc8942E282F38",
//             "0x1b9424ed517f7700e7368e34a9743295a225d889",
//             "0x82fbed074f62386ed43bb816f748e8817bf46ff7",
//             "0xc281bd4db5bf94f02a8525dca954db3895685700",
//             // Github
//             "github:leo21",
//             // Twitter
//             "twitter:leo21_eth",
//             // Telegram
//             "telegram:leo21",
//         ],
//     }
// }
const config: SismoConnectConfig = {
    appId: SISMO_CONNECT_APP_ID,
}
const sismoConnect = SismoConnect({ config });

export async function verify(sismoResponse: SismoConnectResponse) {
    const result: SismoConnectVerifiedResult = await sismoConnect.verify(
        sismoResponse,
        {
            // proofs in the sismoConnectResponse should be valid
            // with respect to a Vault (not Twitter account ownership)
            auths: [
                { authType: AuthType.VAULT },
            ],
            // proofs in the sismoConnectResponse should be valid
            // with respect to a specific group membership
            // here the group with id 0x3b8e71562df9eca2edc0a94d18545257
            claims: [{ groupId: GROUP_ID }],
            signature: { message: "I wanna chat with other USDC/ETH LPers" }
        }
    )
    return result;
}
