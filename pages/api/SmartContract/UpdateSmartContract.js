import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import UpdateSmartContractHandler from "app/handler/updateSmartContractHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(UpdateSmartContractHandler)
