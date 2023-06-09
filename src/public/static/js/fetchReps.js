
 // fetch data from server
export async function getRepData(address, city, state, zip) {

    const URL = 'https://jeffvalcher.com/representatives';
    const QUERY = `?address=${address}&city=${city}&state=${state}&zip=${zip}`;

    try {
        const res = await fetch(`${URL}${QUERY}`);
        const data = await res.json();
        return data;
    } catch (error) {
        console.error(error);
    }
}
