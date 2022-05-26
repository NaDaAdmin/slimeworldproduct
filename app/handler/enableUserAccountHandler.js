import enableUserAccountRequest from "app/validators/enableUserAccountRequest"
import Response from "app/response"

async function EnableUserAccountHandler(req, res) {

	const { acount_id, token_id, encrypted_receiver_key } = req.body
	const payload = {
		acount_id,
		token_id //, encrypted_receiver_key
	}

	const { hashgraphClient } = req.context
	const response = await hashgraphClient.enableUserAccountToken(payload)

	if (response) {
		return Response.json(res, response)
	}

	// This has to be bolstered up with correct error handling
	return Response.associateeror(res)
}

export default EnableUserAccountHandler
