import Response from "app/response"

async function userAccountNFTHandler(req, res) {

	const { account_id } = req.body
	const stakingPayload = {
        account_id
	}

	const { hashgraphClient } = req.context
	const userNFTResponse = await hashgraphClient.userAccountNFT(stakingPayload)

	if (userNFTResponse) {
		return Response.json(res, userNFTResponse)
	}

	// This has to be bolstered up with correct error handling
	return Response.badRequest(res)
}

export default userAccountNFTHandler