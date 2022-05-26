import onlyGet from "app/middleware/onlyGet"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import GetUserAccountNFTHandler from "app/handler/userAccountNFTHandler"

export default prepare(
	onlyGet,
	useHashgraphContext
)(GetUserAccountNFTHandler)
