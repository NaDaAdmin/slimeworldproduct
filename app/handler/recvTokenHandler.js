import recvTokenRequest from "app/validators/recvTokenRequest"
import Response from "app/response"

async function RecvTokenHandler(req, res) {

	const { encrypted_receiver_key, token_id, sender_id, amount } = req.body
	const recvPayload = {
		encrypted_receiver_key,
		token_id,
		sender_id,
		amount
	}
	const { hashgraphClient } = req.context
	const recvResponse = await hashgraphClient.recvToken(recvPayload)

	if (recvResponse) {
		return Response.json(res, recvResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default RecvTokenHandler