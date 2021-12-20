import Response from "app/response"

async function TokenInfoHandler(req, res) {
	const { id } = req.query
	const { hashgraphClient } = req.context

	const tokenInfo = await hashgraphClient.TokenInfoQuery()

	Response.json(res, tokenInfo)
}

export default TokenInfoHandler
