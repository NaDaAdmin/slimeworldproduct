import Response from "app/response"

async function UpdateTokenHandler(req, res) {
	const {
		token_id,
	} = req.body

	console.log("--------------1");
	const { hashgraphClient } = req.context

	console.log("--------------3");
	const token = await hashgraphClient.updateToken({
		token_id,
	})

	Response.json(res, token)
}

export default UpdateTokenHandler
