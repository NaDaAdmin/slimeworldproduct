import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import DeleteSmartContractHandler from "app/handler/deleteSmartContractHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(DeleteSmartContractHandler)
