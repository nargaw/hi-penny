import './style.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import * as CANNON from 'cannon-es'
import cannonDebugger from 'cannon-es-debugger'
import Stats from 'stats.js'
import vertex from './shader/vertex.glsl'
import fragment from './shader/fragment.glsl'
const canvas = document.querySelector('.webgl')

class Scene{
    constructor(){
        this._Init()
    }
    
    _Init(){
        this.stats = new Stats()
        this.stats.showPanel(0)
        document.body.appendChild(this.stats.dom)
        this.scene = new THREE.Scene()
        this.clock = new THREE.Clock()
        this.oldElapsedTime = 0
        this.objectsToUpdate = []
        this.thrusting = false
        this.mouse = new THREE.Vector2()
        this.distance = new THREE.Vector2()
        this.InitPhysics()
        this.InitFireFlies()
        this.InitEnv()
        this.InitText()
        this.InitCamera()
        //this.InitBuildingCreator()
        this.v = new THREE.Vector3()
        this.Car()
        this.InitLights()
        this.InitRenderer()
        //this.InitControls()
        this.Update()
        window.addEventListener('resize', () => {
            this.Resize()
            this.renderer.render(this.scene, this.camera)
        })
        window.addEventListener('mousemove', (event) => {
            this.mouse.x = event.clientX / window.innerWidth * 2 - 1
            this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
        })
        this.keyMap = {}
        this.hoverMap = {}
        this.hoverTouch = {}
        this.onDocumentKey = (e) => {
            this.keyMap[e.key] = e.type === 'keydown'
        }

        this.onDocumentHover = (e) => {
            e.preventDefault()
            this.hoverMap[e.target.id] = e.type === 'mouseover'
            //console.log(this.hoverMap)
        }
        this.logEvents = false;
        this.tpCache = new Array()
        this.onDocumentTouch = (e) => {
            e.preventDefault()
            if (e.targetTouches.length == 2){
                for ( let i = 0; i < e.targetTouches.length; i++){
                    this.tpCache.push(e.targetTouches[i]);
                }
            }
            if(this.logEvents) log('touchStart', e, true)
            this.hoverTouch[e.target.id] = e.type === 'touchstart'
            //console.log(this.hoverTouch)
        }
        

        this.forwardVel = 0
        this.rightVel = 0

        document.addEventListener('keydown', this.onDocumentKey, false)
        document.addEventListener('keyup', this.onDocumentKey, false)
        document.addEventListener('touchstart', this.onDocumentTouch, {passive: false} )
        document.addEventListener('touchend', this.onDocumentTouch, {passive: false}, false)
        document.addEventListener('mouseover', this.onDocumentHover, false)
        document.addEventListener('mouseout', this.onDocumentHover, false)
    }

    
    InitPhysics(){
        this.world = new CANNON.World()
        this.world.gravity.set(0, -40, 0)
        this.defaultMaterial = new CANNON.Material('default')
        this.defaultContactMaterial = new CANNON.ContactMaterial(
            this.defaultMaterial,
            this.defaultMaterial,
            {
                friction: 0.1,
                restitution: 0.2
            }
        )
        this.world.defaultContactMaterial = this.defaultContactMaterial
        this.world.addContactMaterial(this.defaultContactMaterial)
    }

    InitPhysicsDebugger(){
        cannonDebugger(
            this.scene,
            this.world.bodies,
            {
                color: 0x00ff00,
                autoUpdate: true
            }
        )
    }

    InitEnv(){
        this.fog = new THREE.FogExp2(0x191919, 0.001)
        this.scene.fog = this.fog
        this.geometry = new THREE.PlaneBufferGeometry(1000, 1000, 2, 2)
        this.material = new THREE.MeshStandardMaterial({
            
            })
        this.ground = new THREE.Mesh(this.geometry, new THREE.MeshStandardMaterial({
            color: 0xee9b00
        }))
        this.scene.add(this.ground)
        this.ground.rotation.x = -Math.PI * 0.5
        this.ground.receiveShadow = true

        //physics
        this.groundBody = new CANNON.Body({
            mass: 0,
            material: this.defaultMaterial
        })
        this.world.addBody(this.groundBody)
        this.groundBody.addShape(new CANNON.Plane())
        this.groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI * 0.5)
    }

    InitText(){
        this.fontLoader = new THREE.FontLoader()
        this.word = 'HI PENNY'
        this.fontLoader.load(
            './ROR.json',
            (font) => {
                this.textParameters = {
                    font: font,
                    size: 2.0,
                    height: 0.8,
                    curveSegments: 12,
                    bevelEnabled: true,
                    bevelThickness: 0.03,
                    bevelSize: 0.02,
                    bevelOffset: 0,
                    bevelSegments: 5
                }
            
                for (let i = 0; i <= this.word.length -1; i++){
                    this.textGeometry = new THREE.TextGeometry(
                        this.word[i],
                        this.textParameters
                    )
                    this.textMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 })
                    this.text = new THREE.Mesh(this.textGeometry, this.textMaterial)
                    this.scene.add(this.text)
                    this.text.castShadow = true
                    this.textGeometry.computeBoundingBox()
                    this.textGeometry.center()
                    this.text.position.set(0, -0.1, 0)

                    this.boxShape = new CANNON.Box(new CANNON.Vec3(1.0, 1.0, 0.45))
                    this.boxBody = new CANNON.Body({
                    mass: 0.5, 
                    position: new CANNON.Vec3((i * 2.0) - 6, 2, -10),
                    shape: this.boxShape,
                    material: this.ContactMaterial
                    })
                    this.world.addBody(this.boxBody)
                    this.objectsToUpdate.push({
                    mesh: this.text,
                    body: this.boxBody
                    }) 
                }
            }
        )
    }

    InitFireFlies(){
        this.firefliesGeometry = new THREE.BufferGeometry()
        this.firefliesCount = 1000
        this.positionArray = new Float32Array(this.firefliesCount * 3)
        this.scaleArray = new Float32Array(this.firefliesCount)
        for(let i = 0; i < this.firefliesCount; i++){
            this.positionArray[i * 3 + 0] = (Math.random() - 0.5) * 1000
            this.positionArray[i * 3 + 1] = (Math.random()) * 1000
            this.positionArray[i * 3 + 2] = (Math.random() - 0.5) * 1000

            this.scaleArray[i] = Math.random()
        }
        this.firefliesGeometry.setAttribute('position', new THREE.BufferAttribute(this.positionArray, 3))
        this.firefliesGeometry.setAttribute('aScale', new THREE.BufferAttribute(this.scaleArray, 1))

        this.firefliesMaterial = new THREE.ShaderMaterial({
            uniforms: {
                u_time: { value: 0},
                u_pixelRatio: { value: Math.min(window.devicePixelRatio, 2)},
                u_size: { value: 10000 }
            },
            vertexShader: vertex,
            fragmentShader: fragment,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
        this.fireflies = new THREE.Points(this.firefliesGeometry, this.firefliesMaterial)
        this.scene.add(this.fireflies)
    }

    InitBuildingCreator(){
        this.rand = 10 + Math.random() * 25;
        this.buildingGeometry = new THREE.BoxBufferGeometry(10, this.rand, 10)
        this.buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x22223b })
        for (let i = 0; i <= 100; i++){
            this.angle = Math.random() * Math.PI * 2
            this.radius = 10 + Math.random() * 400
            this.x = Math.cos(this.angle) * this.radius
            this.z = Math.sin(this.angle) * this.radius

            this.building = new THREE.Mesh(this.buildingGeometry, this.buildingMaterial)

            this.building.position.set(this.x, this.rand/2, this.z)
            this.scene.add(this.building)

            //bulding physics
            this.buildingBody = new CANNON.Body({
                mass: 0,
                material: this.defaultMaterial
            })
            this.buildingShape = new CANNON.Box(new CANNON.Vec3(5, this.rand/2, 5))
            this.buildingBody.addShape(this.buildingShape)
            this.buildingBody.position.set(this.x, this.rand/2, this.z)
            this.world.addBody(this.buildingBody)
            this.building.castShadow = true
            this.objectsToUpdate.push({
                mesh: this.building,
                body: this.buildingBody
            })
        }
    }

    Car(){
        this.group = new THREE.Group()
        this.carMaterial = new THREE.MeshStandardMaterial({ color: 0x780000 })
        this.box = new THREE.Mesh(new THREE.BoxBufferGeometry(1, 1, 2),  this.carMaterial)
        this.topBox = new THREE.Mesh(new THREE.BoxBufferGeometry(0.5, 0.5, 0.5),  this.carMaterial)
        this.poleFront = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.1, 0.1, 1.5), this.carMaterial)
        this.poleBack = new THREE.Mesh(new THREE.CylinderBufferGeometry(0.1, 0.1, 1.5),  this.carMaterial)
        this.group.add(this.poleFront)
        this.group.add(this.poleBack)
        this.group.add(this.box)
        this.group.add(this.topBox)
        this.topBox.position.set(0, 0.5, 0)
        this.poleFront.rotation.x = -Math.PI * 0.5
        this.poleFront.rotation.z = -Math.PI * 0.5
        this.poleFront.position.set(0.0, -0.5, -1.0)
        this.poleBack.rotation.x = -Math.PI * 0.5
        this.poleBack.rotation.z = -Math.PI * 0.5
        this.poleBack.position.set(0.0, -0.5, 1.0)
        

        // this.group.add(this.wheelsFL, this.wheelsFR, this.wheelsBL, this.wheelsBR)
        this.scene.add(this.group)
        this.group.add(this.chaseCam)
        this.group.position.set(0, 4, 0)

        this.carBodyShape = new CANNON.Box(new CANNON.Vec3(1, 0.25, 1.5))
        this.carBody = new CANNON.Body({
            mass: 40,
            material: this.defaultMaterial
        })
        this.carBody.addShape(this.carBodyShape)
        this.world.addBody(this.carBody)
        this.carBody.position.copy(this.box.position)
        this.carBody.angularDamping = 0.9
        this.objectsToUpdate.push({
            mesh: this.group,
            body: this.carBody
        })

        this.wheelGeometry = new THREE.CylinderBufferGeometry(0.33, 0.33, 0.2)
        this.wheelGeometry.rotateZ(Math.PI * 0.5)
        //Left Front Wheel
        this.wheelsFL = new THREE.Mesh(this.wheelGeometry,  this.carMaterial)
        this.scene.add(this.wheelsFL)
        this.wheelsFL.position.set(-1, 3, -1)
        this.wheelsFLShape = new CANNON.Sphere(0.33)
        this.wheelsFLBody = new CANNON.Body({
            mass: 1,
            material: this.defaultMaterial
        })
        this.wheelsFLBody.addShape(this.wheelsFLShape)
        this.wheelsFLBody.position.copy(this.wheelsFL.position)
        this.world.addBody(this.wheelsFLBody)
        this.wheelsFLBody.angularDamping = 0.4
        this.wheelsFLBody.applyLocalForce = 20
        this.objectsToUpdate.push({
            mesh: this.wheelsFL,
            body: this.wheelsFLBody
        })
        
        
        //Right Front Wheel
        this.wheelsFR = new THREE.Mesh(this.wheelGeometry,  this.carMaterial)
        this.scene.add(this.wheelsFR)
        this.wheelsFR.position.set(1, 3, -1)
        this.wheelsFRShape = new CANNON.Sphere(0.33)
        this.wheelsFRBody = new CANNON.Body({
            mass: 1,
            material: this.defaultMaterial
        })
        this.wheelsFRBody.addShape(this.wheelsFRShape)
        this.wheelsFRBody.position.copy(this.wheelsFR.position)
        this.world.addBody(this.wheelsFRBody)
        this.wheelsFRBody.angularDamping = 0.4
        this.wheelsFRBody.applyLocalForce = 20
        this.objectsToUpdate.push({
            mesh: this.wheelsFR,
            body: this.wheelsFRBody
        })

        //Left Back Wheel
        this.wheelsBL = new THREE.Mesh(this.wheelGeometry,  this.carMaterial)
        this.scene.add(this.wheelsBL)
        this.wheelsBL.position.set(-1, 3, 1)
        this.wheelsBLShape = new CANNON.Sphere(0.4)
        this.wheelsBLBody = new CANNON.Body({
            mass: 1,
            material: this.defaultMaterial
        })
        this.wheelsBLBody.addShape(this.wheelsBLShape)
        this.wheelsBLBody.position.copy(this.wheelsBL.position)
        this.world.addBody(this.wheelsBLBody)
        this.wheelsBLBody.angularDamping = 0.4
        this.objectsToUpdate.push({
            mesh: this.wheelsBL,
            body: this.wheelsBLBody
        })

        //Right Back Wheel
        this.wheelsBR = new THREE.Mesh(this.wheelGeometry,  this.carMaterial)
        this.scene.add(this.wheelsBR)
        this.wheelsBR.position.set(1, 3, 1)
        this.wheelsBRShape = new CANNON.Sphere(0.4)
        //this.wheelsBRShape = new CANNON.Cylinder(0.4, 0.4, 0.4)
        this.wheelsBRBody = new CANNON.Body({
            mass: 1,
            material: this.defaultMaterial
        })
        this.wheelsBRBody.addShape(this.wheelsBRShape)
        this.wheelsBRBody.position.copy(this.wheelsBR.position)
        this.world.addBody(this.wheelsBRBody)
        this.wheelsBRBody.angularDamping = 0.4
        this.objectsToUpdate.push({
            mesh: this.wheelsBR,
            body: this.wheelsBRBody
        })

        //constraints
        this.FLaxis = new CANNON.Vec3(1, 0, 0)
        this.FRaxis = new CANNON.Vec3(1, 0, 0)
        this.BLaxis = new CANNON.Vec3(1, 0, 0)
        this.BRaxis = new CANNON.Vec3(1, 0, 0)
        this.constraintFL = new CANNON.HingeConstraint(this.carBody, this.wheelsFLBody, {
            pivotA: new CANNON.Vec3(-0.75, -0.5, -1),
            axisA: this.FLaxis,
            maxForce: 13
        })
        this.world.addConstraint(this.constraintFL)

        this.constraintFR = new CANNON.HingeConstraint(this.carBody, this.wheelsFRBody, {
            pivotA: new CANNON.Vec3(0.75, -0.5, -1),
            axisA: this.FRaxis,
            maxForce: 13
        })
        this.world.addConstraint(this.constraintFR)

        this.constraintBL = new CANNON.HingeConstraint(this.carBody, this.wheelsBLBody, {
            pivotA: new CANNON.Vec3(-0.75, -0.5, 1),
            axisA: this.BLaxis,
            maxForce: 13
        })
        this.world.addConstraint(this.constraintBL)

        this.constraintBR = new CANNON.HingeConstraint(this.carBody, this.wheelsBRBody, {
            pivotA: new CANNON.Vec3(0.75, -0.5, 1),
            axisA: this.BRaxis,
            maxForce: 13
        })
        this.world.addConstraint(this.constraintBR)

        this.constraintBL.enableMotor()
        this.constraintBR.enableMotor()
        //this.constraintFL.enableMotor()
        //this.constraintFR.enableMotor()
    }
        
    InitRenderer(){
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
        })
        this.renderer.shadowMap.enabled = true
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
        this.renderer.setClearColor(0x001219)
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.render(this.scene, this.camera)
        this.firefliesMaterial.uniforms.u_pixelRatio.value = Math.min(window.devicePixelRatio, 2)
    }

    InitCamera(){
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000)
        this.camera.position.set(0, 1 ,5 )
        this.scene.add(this.camera)
        this.chaseCam = new THREE.Object3D()
        this.chaseCam.position.set(0, 0, 0)
        this.chaseCamPivot = new THREE.Object3D()
        this.chaseCamPivot.position.set(0, 2, 4)
        this.chaseCam.add(this.chaseCamPivot)
        this.scene.add(this.chaseCam)
    }

    InitLights(){
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.1)
        this.scene.add(this.ambientLight)
        this.pointLight = new THREE.PointLight(0xffffff, 1.2)
        this.scene.add(this.pointLight)
        this.pointLight.position.set(20, 50, 20)
        this.pointLight.castShadow = true
        this.pointLight.shadow.mapSize.width = 1024;
        this.pointLight.shadow.mapSize.height = 1024;
        this.pointLightHelper = new THREE.PointLightHelper(this.pointLight, 0.3, 0xff0000)
        this.scene.add(this.pointLightHelper)

        this.headLight = new THREE.PointLight(0xffffff, 1, 5, 1)
        //this.pointLightHelper = new THREE.PointLightHelper(this.headLight, 0.1, 0xffff00)
        this.headLight.position.set(0, 0.25, -3)
        //this.scene.add(this.pointLightHelper)
        //this.headLightHelper = new THREE.PointlLightHelper(this.headLight, 0.1, 0xffff00)
        this.group.add(this.headLight)
    }

    InitControls(){
        this.controls = new OrbitControls(this.camera, canvas)
        this.controls.enableDamping = true
        this.controls.update()
    }

    Resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
    }

    Update(){
        requestAnimationFrame(() => {
            console.time()
           this.stats.begin()
            this.firefliesMaterial.uniforms.u_time.value = this.oldElapsedTime
            this.elapsedTime = this.clock.getElapsedTime()
            this.deltaTime = this.elapsedTime - this.oldElapsedTime
            this.oldElapsedTime = this.elapsedTime
            this.world.step(1/60, this.oldElapsedTime, 3)

            this.camera.lookAt(this.group.position)

            this.chaseCamPivot.getWorldPosition(this.v)
            if (this.v.y < 1){
                this.v.y = 1
            }
            this.camera.position.lerpVectors(this.camera.position, this.v, 0.1)

            for(this.object of this.objectsToUpdate){
                this.object.mesh.position.copy(this.object.body.position)
                this.object.mesh.quaternion.copy(this.object.body.quaternion)
            }
            this.thrusting = false
            
            
            if (this.keyMap['w'] || this.hoverMap['3']  || this.hoverTouch['3']|| this.keyMap['ArrowUp']){
                if(this.forwardVel < 12.0){
                    this.forwardVel += 0.5
                    this.thrusting = true
                } 
            }

            if (this.keyMap['s'] || this.hoverMap['4'] || this.hoverTouch['4'] || this.keyMap['ArrowDown']){
                if(this.forwardVel > -5.0){
                    this.forwardVel -= 1
                    this.thrusting = true 
                } 
            }

            if (this.keyMap['a'] || this.hoverMap['1'] || this.hoverTouch['1']|| this.keyMap['ArrowLeft']){
                if(this.rightVel > -0.5){
                   // this.forwardVel += 0.5
                   // this.thrusting = true
                    this.rightVel -= 0.025
                } 
            }

            if (this.keyMap['d'] || this.hoverMap['2'] || this.hoverTouch['2']|| this.keyMap['ArrowRight']){
                if(this.rightVel < 0.5){
                    //this.forwardVel += 0.5
                   // this.thrusting = true
                    this.rightVel += 0.025
                } 
            }
            if (this.keyMap[' ']){
                if(this.forwardVel > 0){
                    this.forwardVel -= 1
                }
                if(this.forwardVel < 0){
                    this.forwardVel += 1
                }
            }

            if (!this.thrusting){
                if (this.forwardVel > 0){
                    this.forwardVel -= 0.25
                }
                if(this.forwardVel < 0){
                    this.forwardVel += 0.25
                }
                if(this.rightVel > 0){
                    this.rightVel -= 0.01
                }
                if(this.rightVel < 0){
                    this.rightVel += 0.01
                }
            }

            this.constraintBL.setMotorSpeed(this.forwardVel)
            this.constraintBR.setMotorSpeed(this.forwardVel)
            //this.constraintFL.setMotorSpeed(this.forwardVel)
            //this.constraintFR.setMotorSpeed(this.forwardVel)
            this.constraintFL.axisA.z = this.rightVel
            this.constraintFR.axisA.z = this.rightVel
            
            //this.controls.update()
            //console.log(this.mouse.x, this.mouse.y)
            this.stats.end()
            this.renderer.render(this.scene, this.camera)
            console.timeEnd()
            this.Update()
            }) 
    }
}

let _APP = null

window.addEventListener('DOMContentLoaded', () => {
    _APP = new Scene()
})