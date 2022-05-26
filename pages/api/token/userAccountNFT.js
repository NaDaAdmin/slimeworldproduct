import onlyPost from "app/middleware/onlyPost"
import useHashgraphContext from "app/context/useHashgraphContext"
import prepare from "app/utils/prepare"
import userAccountNFTHandler from "app/handler/userAccountNFTHandler"

export default prepare(
	onlyPost,
	useHashgraphContext
)(userAccountNFTHandler)
