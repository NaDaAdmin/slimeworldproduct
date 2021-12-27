import createTokenRequest from "app/validators/createTokenRequest"
import Response from "app/response"
import Specification from "app/hashgraph/tokens/specifications"

async function CreateTokenHandler(req, res) {
	const validationErrors = createTokenRequest(req.body)

	if (validationErrors) {
		return Response.unprocessibleEntity(res, validationErrors)
	}

	const {
		symbol,
		name,
		supply,
		memo
	} = req.body

	const { hashgraphClient } = req.context

	const token = await hashgraphClient.createToken({
		specification: Specification.Fungible,
		memo,
		name,
		symbol,
		supply
	})

	Response.json(res, token)
}

export default CreateTokenHandler
