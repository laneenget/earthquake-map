/* Assignment 3: Earthquake Visualization
 * CSCI 4611, Fall 2022, University of Minnesota
 * Instructor: Evan Suma Rosenberg <suma@umn.edu>
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 */ 

import * as gfx from 'gophergfx'
import { Vector3 } from 'gophergfx';
import { EarthquakeMarker } from './EarthquakeMarker';
import { EarthquakeRecord } from './EarthquakeRecord';

export class Earth extends gfx.Transform3
{
    private earthMesh: gfx.Mesh;
    private earthMaterial: gfx.MorphMaterial;
    private morphAlpha: number;

    public globeMode: boolean;
    public naturalRotation: gfx.Quaternion;
    public mouseRotation: gfx.Quaternion;

    constructor()
    {
        // Call the superclass constructor
        super();

        this.earthMesh = new gfx.Mesh();
        this.earthMaterial = new gfx.MorphMaterial();
        this.morphAlpha = 0;

        this.globeMode = false;
        this.naturalRotation = new gfx.Quaternion();
        this.mouseRotation = new gfx.Quaternion();
    }

    public createMesh() : void
    {
        // Initialize texture: you can change to a lower-res texture here if needed
        // Note that this won't display properly until you assign texture coordinates to the mesh
        this.earthMaterial.texture = new gfx.Texture('./assets/earth-2k.png');
        
        // This disables mipmapping, which makes the texture appear sharper
        this.earthMaterial.texture.setMinFilter(true, false);

        // 20x20 is reasonable for a good looking sphere
        // 150x150 is better for height mapping
        //const meshResolution = 20;     
        const meshResolution = 150;

        // A rotation about the Z axis is the earth's axial tilt
        this.naturalRotation.setRotationZ(-23.4 * Math.PI / 180); 
        
        // Precalculated vertices, normals, and triangle indices.
        // After we compute them, we can store them directly in the earthMesh,
        // so they don't need to be member variables.
        const mapVertices: number[] = [];
        const mapNormals: number[] = [];
        const indices: number[] = [];
        const texCoords: number[] = [];
        const pi = Math.PI;
        const meshIncrement = pi / meshResolution;
        
        let y = 0;
        for (let j = pi/2; j >= -pi/2 + meshIncrement; j-=meshIncrement) {
            let x = 0
            for (let i = -pi; i <= pi; i+=2*meshIncrement) {
                mapVertices.push(i, j, 0);
                mapVertices.push(i, j-meshIncrement, 0);
                texCoords.push(x, y);
                texCoords.push(x, y+1/meshResolution);
                x += 1/meshResolution;
            }
            y += 1/meshResolution;
        }

        // The normals are always directly outward towards the camera
        for (let i = 0; i < mapVertices.length; i++) {
            mapNormals.push(0, 0, 1);
        }
        
        let temp = meshResolution * 2 + 1
        for (let i = 0; i < mapVertices.length/3 - 2; i++) {
            if(i == temp) {
                temp += (meshResolution * 2 + 2);
                continue;
            } else {
                indices.push(i, i+1, i+2);
            }
        }
        
        temp = meshResolution * 2;
        for (let i = 1; i < mapVertices.length/3 - 2; i++) {
            if (i == temp) {
                temp += (meshResolution * 2 + 2);
                continue;
            } else {
                indices.push(i, i+2, i+1);
            }
        }

        const sphereVertices: number[] = [];
        const sphereNormals: number[] = [];

        for (let i = 0; i < mapVertices.length; i+=3) {
            const toSphere = this.convertLatLongToSphere(mapVertices[i], mapVertices[i+1]);
            sphereVertices.push(toSphere.x, toSphere.y, toSphere.z);
        }

        const originVector = new Vector3(0, 0, 0)
        for (let i = 0; i <= sphereVertices.length; i+=3) {
            const vertVector = new Vector3(sphereVertices[i], sphereVertices[i+1], sphereVertices[i+2]);
            const normalVector = Vector3.subtract(vertVector, originVector);
            Vector3.normalize(normalVector);
            sphereNormals.push(normalVector.x, normalVector.y, normalVector.z);
        }

        // Set all the earth mesh data
        this.earthMesh.setVertices(mapVertices, true);
        this.earthMesh.setMorphTargetVertices(sphereVertices, true);
        this.earthMesh.setNormals(mapNormals, true);
        this.earthMesh.setMorphTargetNormals(sphereNormals, true);
        this.earthMesh.setIndices(indices);
        this.earthMesh.setTextureCoordinates(texCoords);
        this.earthMesh.createDefaultVertexColors();
        this.earthMesh.material = this.earthMaterial;

        // Add the mesh to this group
        this.add(this.earthMesh);
    }

    // TO DO: add animations for mesh morphing
    public update(deltaTime: number) : void
    {
        const morphSpeed = 0.75;
        let alpha = 0;

        alpha += morphSpeed * deltaTime;

        if (this.globeMode == true) {
            this.earthMaterial.morphAlpha = 1;
            this.children.forEach((quake: gfx.Transform3) => {
                if(quake instanceof EarthquakeMarker)
                {
                    quake.position.copy(quake.globePosition);
                }
            })
        } else {
            this.earthMaterial.morphAlpha = 0;
            this.children.forEach((quake: gfx.Transform3) => {
                if(quake instanceof EarthquakeMarker)
                {
                    quake.position.copy(quake.mapPosition);
                }
            })
        }
    }

    public createEarthquake(record: EarthquakeRecord, normalizedMagnitude : number)
    {
        // Number of milliseconds in 1 year (approx.)
        const duration = 12 * 28 * 24 * 60 * 60;

        // TO DO: currently, the earthquake is just placed randomly on the plane
        // You will need to update this code to calculate both the map and globe positions
        const mapPosition = this.convertLatLongToPlane(record.latitude, record.longitude);
        const globePosition = this.convertLatLongToSphere(record.latitude, record.longitude);
        const earthquake = new EarthquakeMarker(mapPosition, globePosition, record, duration);

        // Initially, the color is set to yellow.
        // You should update this to be more a meaningful representation of the data.
        if (record.magnitude < 7.0) { 
            earthquake.material.setColor(new gfx.Color(0, 1, 0));
        } else if (record.magnitude >= 7.0 && record.magnitude < 8.0) {
            earthquake.material.setColor(new gfx.Color(1, 1, 0));
        } else if (record.magnitude >= 8.0) {
            earthquake.material.setColor(new gfx.Color(1, 0, 0));
        }
        this.add(earthquake);
    }

    public animateEarthquakes(currentTime : number)
    {
        // This code removes earthquake markers after their life has expired
        this.children.forEach((quake: gfx.Transform3) => {
            if(quake instanceof EarthquakeMarker)
            {
                const playbackLife = (quake as EarthquakeMarker).getPlaybackLife(currentTime);
                if(playbackLife >= 1)
                {
                    quake.remove();
                }
                else
                {
                    // Global adjustment to reduce the size. You should probably update this be a
                    // more meaningful representation of the earthquake's lifespan.
                    quake.scale.set(0.5, 0.5, 0.5);
                }
            }
        });
    }

    public convertLatLongToSphere(latitude: number, longitude: number) : gfx.Vector3
    {
        // TO DO: We recommend filling in this function to put all your
        // lat,long --> plane calculations in one place.
        const x = Math.cos(latitude) * Math.sin(longitude);
        const y = Math.sin(latitude);
        const z = Math.cos(latitude) * Math.cos(longitude);
        return new gfx.Vector3(x, y, z);
    }

    public convertLatLongToPlane(latitude: number, longitude: number) : gfx.Vector3
    {
        // TO DO: We recommend filling in this function to put all your
        // lat,long --> plane calculations in one place.
        const lat = latitude * Math.PI/180;
        const long = longitude * Math.PI/180;
        return new gfx.Vector3(long, lat, 0);
    }

    // This function toggles the wireframe debug mode on and off
    public toggleDebugMode(debugMode : boolean)
    {
        this.earthMaterial.wireframe = debugMode;
    }
}