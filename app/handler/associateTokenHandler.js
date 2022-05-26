import Response from "app/response"

async function AssociateTokenHandler(req, res) {



	const { privateKey, account_id, token_id } = req.body
	const associateTokenResponsePayload = {
		privateKey,
        account_id,
		token_id
	}
	const { hashgraphClient } = req.context
	const associateTokenResponse = await hashgraphClient.associateToken(associateTokenResponsePayload)

	if (associateTokenResponse) {
		return Response.json(res, associateTokenResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default AssociateTokenHandler
