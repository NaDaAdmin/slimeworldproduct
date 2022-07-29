import sendNFTRequest from "app/validators/sendNFTRequest"
import Response from "app/response"

async function SendNFTHandler(req, res) {

	// const validationErrors = sendNFTRequest(req.body)

	// if (validationErrors) {
	// 	return Response.unprocessibleEntity(res, validationErrors)
	// }


	const { token_id, account_id, serialNum } = req.body
	const sendNFTPayload = {
		token_id,
		account_id,
		serialNum,
	}
	const { hashgraphClient } = req.context
	const sendNFTResponse = await hashgraphClient.sendNFT(sendNFTPayload)

	if (sendNFTResponse) {
		return Response.json(res, sendNFTResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default SendNFTHandler
