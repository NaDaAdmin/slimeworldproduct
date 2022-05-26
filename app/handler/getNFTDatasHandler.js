import Response from "app/response"

async function getNFTDatasHandler(req, res) {

	const { nft_id, serialNum } = req.body
	const payload = {
        nft_id,
		serialNum
	}

	const { hashgraphClient } = req.context
	const userNFTResponse = await hashgraphClient.getNFTDatas(payload)

	if (userNFTResponse) {
		return Response.json(res, userNFTResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default getNFTDatasHandler