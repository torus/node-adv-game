module.exports = () => {
  const GameRuntime = function() {
    this.inst = []
  }

  GameRuntime.prototype.addInstruction = function(command, ...args) {
    this.inst.push([command, ...args])
  }

  return GameRuntime
}
