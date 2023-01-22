import axios from "axios"

test('Baserow query content', async () => {
    const res = await axios({
        method: "GET",
        url: "https://api.baserow.io/api/database/fields/table/128487/",
        headers: {
            Authorization: "Token 880HCXfU5hM7TK9ehtSq4pcY0O6uhxvM"
        }
    })
    console.log(res)
})
export default {}