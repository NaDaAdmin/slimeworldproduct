import Response from "app/response"

async function UpdateTokenHandler(req, res) {
	const {
		token_id,
		adminKey,
		kycKey,
		supplyKey,
		freezeKey,
		wipeKey,
	} = req.body

	const { hashgraphClient } = req.context

	const token = await hashgraphClient.updateToken({
		token_id,
		adminKey,
		kycKey,
		supplyKey,
		freezeKey,
		wipeKey,
	})

	Response.json(res, token)
}

export default UpdateTokenHandler
