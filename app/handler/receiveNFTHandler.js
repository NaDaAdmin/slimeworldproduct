import receiveNFTRequest from "app/validators/receiveNFTRequest"
import Response from "app/response"

async function ReceiveNFTHandler(req, res) {

	// const validationErrors = receiveNFTRequest(req.body)

	// if (validationErrors) {
	// 	return Response.unprocessibleEntity(res, validationErrors)
	// }


	const { privateKey, token_id, account_id, account_id2, serialNum } = req.body
	const receiveNFTPayload = {
		privateKey,
		token_id,
		account_id,
		account_id2,
		serialNum,
	}
	const { hashgraphClient } = req.context
	const receiveNFTResponse = await hashgraphClient.receiveNFT(receiveNFTPayload)

	if (receiveNFTResponse) {
		return Response.json(res, receiveNFTResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default ReceiveNFTHandler
