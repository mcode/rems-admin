import Extension from "../models/Extension";

const dR = {
    id: {
        type: String,
        unique: true,
        index: true
      },
    extension: {
        type: [Extension],
        default: void 0
    }
}



export default dR;