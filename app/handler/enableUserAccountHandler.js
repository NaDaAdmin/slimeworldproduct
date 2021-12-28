import enableUserAccountRequest from "app/validators/enableUserAccountRequest"
import Response from "app/response"

async function EnableUserAccountHandler(req, res) {
	const validationErrors = enableUserAccountRequest(req.body)

	if (validationErrors) {
		return Response.unprocessibleEntity(res, validationErrors)
	}

	const { encrypted_receiver_key, acount_id, token_id } = req.body
	const payload = {
		encrypted_receiver_key,
		acount_id,
		token_id
	}

	const { hashgraphClient } = req.context
	const response = await hashgraphClient.enableUserAccountToken(payload)

	if (response) {
		return Response.json(res, response)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default EnableUserAccountHandler
