import atomicSwapRequest from "app/validators/atomicSwapRequest"
import Response from "app/response"

async function AtomicSwapHandler(req, res) {

	// const validationErrors = atomicSwapRequest(req.body)

	// if (validationErrors) {
	// 	return Response.unprocessibleEntity(res, validationErrors)
	// }


	const { encrypted_receiver_key, token_id1, token_id2, account_id1, account_id2, serialNum, amount } = req.body
	const atomicPayload = {
		encrypted_receiver_key,
		token_id1,
        token_id2,
		account_id1,
        account_id2,
		serialNum,
		amount
	}
	const { hashgraphClient } = req.context
	const atomicSwapResponse = await hashgraphClient.atomicSwap(atomicPayload)

	if (atomicSwapResponse) {
		return Response.json(res, atomicSwapResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default AtomicSwapHandler
