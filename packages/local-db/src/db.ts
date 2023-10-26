import { nanoid } from 'nanoid'
import { Database } from '@penx/indexeddb'
import { Space } from '@penx/model'
import { IExtension, IFile, INode, ISpace, NodeStatus } from '@penx/types'
import { getNewNode } from './getNewNode'
import { getNewSpace } from './getNewSpace'
import { tableSchema } from './table-schema'

const database = new Database({
  version: 1,
  name: 'PenxDB',
  // indexedDB: isServer ? undefined : window.indexedDB,
  tables: tableSchema,
})

class DB {
  database = database

  get space() {
    return database.useModel<ISpace>('space')
  }

  get node() {
    return database.useModel<INode>('node')
  }

  get file() {
    return database.useModel<IFile>('file')
  }

  get extension() {
    return database.useModel<IExtension>('extension')
  }

  init = async () => {
    const count = await this.space.count()
    if (count === 0) {
      const space = await this.createSpace({ name: 'My Space' })
    }
    // const space = await this.space.toCollection().first()
    const space = (await this.space.selectAll())[0]

    return space!
  }

  createSpace = async (data: Partial<ISpace>, initNode = true) => {
    const newSpace = getNewSpace(data)
    const spaceId = newSpace.id

    await this.space.insert(newSpace)

    const spaces = await this.listSpaces()

    for (const space of spaces) {
      await this.space.updateByPk(space.id, {
        isActive: false,
      })
    }

    if (initNode) {
      const node = getNewNode(spaceId)

      await this.createPageNode(node)

      await this.space.updateByPk(spaceId, {
        isActive: true,
        activeNodeId: node.id,
      })
    } else {
      await this.space.updateByPk(spaceId, {
        isActive: true,
      })
    }

    const space = await this.space.selectByPk(spaceId)!
    return space as ISpace
  }

  selectSpace = async (spaceId: string) => {
    const spaces = await this.listSpaces()

    for (const space of spaces) {
      await this.space.updateByPk(space.id, {
        isActive: false,
      })
    }

    await this.space.updateByPk(spaceId, {
      isActive: true,
    })
  }

  listSpaces = () => {
    return this.space.selectAll()
  }

  getSpace = (spaceId: string) => {
    return this.space.selectByPk(spaceId) as any as Promise<ISpace>
  }

  getActiveSpace = async () => {
    const spaces = await this.listSpaces()
    const space = spaces.find((space) => space.isActive)
    return space!
  }

  updateSpace = (spaceId: string, space: Partial<ISpace>) => {
    return this.space.updateByPk(spaceId, space)
  }

  getNode = (nodeId: string) => {
    return this.node.selectByPk(nodeId)
  }

  updateNode = async (nodeId: string, data: Partial<INode>) => {
    const newNode = await this.node.updateByPk(nodeId, {
      ...data,
      updatedAt: Date.now(),
    })

    return newNode
  }

  trashNode = async (nodeId: string) => {
    return await this.updateNode(nodeId, {
      status: NodeStatus.TRASHED,
    })
  }

  restoreNode = async (nodeId: string) => {
    return await this.updateNode(nodeId, {
      status: NodeStatus.NORMAL,
    })
  }
  deleteNode = async (nodeId: string) => {
    const node = await this.getNode(nodeId)
    await this.updateSnapshot(node, 'delete')
    return this.node.deleteByPk(nodeId)
  }

  createPageNode = async (node: Partial<INode>) => {
    const { spaceId = '' } = node

    const subNode = await this.node.insert(getNewNode(spaceId))

    const newNode = await this.node.insert({
      ...getNewNode(node.spaceId!),
      ...node,
      children: [subNode.id],
    })

    const space = await this.getSpace(spaceId)

    await this.space.updateByPk(spaceId, {
      children: [...(space.children || []), newNode.id],
    })
    return newNode
  }

  createNode = async (node: Partial<INode>) => {
    const newNode = await this.node.insert({
      ...getNewNode(node.spaceId!),
      ...node,
    })

    return newNode
  }

  listNodesBySpaceId = async (spaceId: string) => {
    return this.node.select({
      where: { spaceId },
    })
  }

  listNormalNodes = async (spaceId: string) => {
    return this.node.select({
      where: {
        spaceId,
        // status: NodeStatus.NORMAL,
      },
    })
  }

  updateSnapshot = async (
    node: INode,
    action: 'add' | 'delete' | 'update',
    editorValue?: any,
  ) => {
    const spaceRaw = await this.getSpace(node.spaceId)
    const space = new Space(spaceRaw)
    space.snapshot[action](node.id, editorValue)

    await this.updateSpace(space.id, {
      snapshot: space.snapshot.toJSON(),
    })
  }

  listTrashedNodes = async (spaceId: string) => {
    return this.node.select({
      where: {
        spaceId,
        status: NodeStatus.TRASHED,
      },
    })
  }

  listNodeByIds = (nodeIds: string[]) => {
    const promises = nodeIds.map((id) => this.node.selectByPk(id))
    return Promise.all(promises) as any as Promise<INode[]>
  }

  deleteNodeByIds = (nodeIds: string[]) => {
    const promises = nodeIds.map((id) => this.node.deleteByPk(id))
    return Promise.all(promises)
  }

  createExtension(extension: IExtension) {
    return this.extension.insert(extension)
  }

  getExtension = (extensionId: string) => {
    return this.extension.selectByPk(extensionId)
  }

  updateExtension = (extensionId: string, plugin: Partial<IExtension>) => {
    return this.extension.updateByPk(extensionId, plugin)
  }

  installExtension = async (extension: Partial<IExtension>) => {
    const list = await this.extension.select({
      where: {
        spaceId: extension.spaceId!,
        slug: extension.slug!,
      },
    })

    if (list?.length) {
      const ext = list[0]!
      return this.extension.updateByPk(ext.id, {
        ...ext,
        ...extension,
      })
    }

    return this.extension.insert({
      id: nanoid(),
      ...extension,
    })
  }

  listExtensions = async () => {
    return (await this.extension.selectAll()) as IExtension[]
  }

  createFile(file: Partial<IFile>) {
    return this.file.insert({
      id: nanoid(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...file,
    })
  }

  getFile = (id: string) => {
    return this.file.selectByPk(id)
  }
}

export const db = new DB()
