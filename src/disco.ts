import { DISCO_TEST_API_KEY } from "./apiKeys";

const DISCO_ISSUER = 'did:3:kjzl6cwe1jw14be3xf0tlp2do529lo4jetn99gbwvdrgureee3w5ea135ankx2z';
const DISCO_TEST_VC_ID = "https://api.disco.xyz/credential/ec8d685c-b570-4913-8a2c-2b1bd091510e";

export const discoCheck = async (encodedId: string) => {
    const apiUrl = `https://api.disco.xyz/v1/credential/${encodedId}`;
    const headers = new Headers({
        'Authorization': `Bearer ${DISCO_TEST_API_KEY}`,
    });

    try {
        const response = await fetch(apiUrl, { headers });
        // console.log(response);
        if (response.ok) {
            const data = await response.json();
            console.log(data);
            const memberId = data.vc.credentialSubject.memberId;
            const id = data.vc.credentialSubject.id;
            return { memberId, id };
        } else {
            throw new Error(`Failed to fetch data: ${response.status} - ${response.statusText}`);
        }
    } catch (error) {
        console.error(error);
    }

    return null;
};