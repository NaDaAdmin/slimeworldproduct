import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import GetSmartContractHandler from "app/handler/getSmartContractHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(GetSmartContractHandler)
